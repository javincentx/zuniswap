import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AddressLike, BigNumberish, Numeric } from "ethers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Exchange, Token } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
const toWei = (value: Numeric) => hre.ethers.parseEther(value.toString());
const fromWei = (value: BigNumberish) => hre.ethers.formatEther(typeof value === "string" ? value : value.toString());
const getBalance = (address: AddressLike) => hre.ethers.provider.getBalance(address);

describe("Exchange", function () {
    let token: Token, exchange: Exchange, owner: HardhatEthersSigner, user: HardhatEthersSigner, exchangeAddress: string;

    async function deployExchangeFixture() {
        const [owner, user] = await hre.ethers.getSigners();
        const token = await ethers.deployContract("Token", ["DogeToken", "DOGE", toWei(1000000)])
        const tokenAddress = await token.getAddress();
        console.log("Token Contract deployed to address:", tokenAddress);

        const exchange = await ethers.deployContract("Exchange", [tokenAddress]);
        const exchangeAddress = await exchange.getAddress();
        console.log("Exchange Contract deployed to address:", exchangeAddress);

        return { token, exchange, owner, user, tokenAddress, exchangeAddress };
    }

    
    it("is deployed", async () => {
        const { exchange} = await loadFixture(deployExchangeFixture);
        expect(await exchange.name()).to.equal("Zuniswap-V1");
        expect(await exchange.symbol()).to.equal("ZUNI-V1");
        expect(await exchange.totalSupply()).to.equal(toWei(0));
    });

    describe("addLiquidity", async function () {

        describe("empty reserves", async function () {
            it("add liquidity", async function () {
                const { token, exchange, exchangeAddress } = await loadFixture(deployExchangeFixture);
                await token.approve(exchangeAddress, toWei(2000));
                await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });
                expect(await getBalance(exchangeAddress)).to.equal(toWei(1000));
                expect(await exchange.getReserve()).to.equal(toWei(2000));

            });

            it("mints LP tokens", async function () {
                const { token, exchange, exchangeAddress, owner } = await loadFixture(deployExchangeFixture);
                await token.approve(exchangeAddress, toWei(2000));
                await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });
                expect(await exchange.balanceOf(owner.address)).to.eq(toWei(1000));
                expect(await exchange.totalSupply()).to.eq(toWei(1000));

            });

            it("allows zero amounts", async function () {
                const { token, exchange, exchangeAddress, owner } = await loadFixture(deployExchangeFixture);

                await token.approve(exchangeAddress, 0);
                await exchange.addLiquidity(0, { value: 0 });

                expect(await getBalance(exchangeAddress)).to.equal(0);
                expect(await exchange.getReserve()).to.equal(0);


            });
        });

        describe("existing reserves", async function () {

            beforeEach(async function () {
                ({ token, exchange, owner, exchangeAddress } = await loadFixture(deployExchangeFixture));
                await token.approve(exchangeAddress, toWei(300));
                await exchange.addLiquidity(toWei(200), { value: toWei(100) });
            });

            it("preserves exchange rate", async function () {
                await exchange.addLiquidity(toWei(200), { value: toWei(50) });
                expect(await getBalance(exchangeAddress)).to.equal(toWei(150));
                expect(await exchange.getReserve()).to.equal(toWei(300));
            });

            it("mints LP tokens", async function () {
                await exchange.addLiquidity(toWei(200), { value: toWei(50) });
                expect(await exchange.balanceOf(owner.address)).to.eq(toWei(150));
                expect(await exchange.totalSupply()).to.eq(toWei(150));
            });

            it("fails when not enough tokens", async function () {
                await expect(
                    exchange.addLiquidity(toWei(50), { value: toWei(50) })
                ).to.be.revertedWith("insufficient token amount");
            });
        });
    });

    describe("removeLiquidity", async function () {

        beforeEach(async () => {
            ({ token, exchange, owner, user, exchangeAddress } = await loadFixture(deployExchangeFixture));
            await token.approve(exchangeAddress, toWei(300));
            await exchange.addLiquidity(toWei(200), { value: toWei(100) });
            // console.log("LP-tokens total supply: ", await exchange.totalSupply());
        });

        it("removes some liquidity", async function () {
            const userEtherBalanceBefore = await getBalance(owner.address);
            const userTokenBalanceBefore = await token.balanceOf(owner.address);

            await exchange.removeLiquidity(toWei(25));

            expect(await exchange.getReserve()).to.equal(toWei(150));
            expect(await getBalance(exchangeAddress)).to.equal(toWei(75));

            const userEtherBalanceAfter = await getBalance(owner.address);
            const userTokenBalanceAfter = await token.balanceOf(owner.address);

            expect(
                fromWei((userEtherBalanceAfter - userEtherBalanceBefore))
            ).to.equal("24.99999999993679"); // 25 - gas fees

            expect(
                fromWei((userTokenBalanceAfter - userTokenBalanceBefore))
            ).to.equal("50.0");
        });

        it("removes all liquidity", async () => {
            const userEtherBalanceBefore = await getBalance(owner.address);
            const userTokenBalanceBefore = await token.balanceOf(owner.address);
            // console.log("userEtherBalanceBefore: ", userEtherBalanceBefore);
            // console.log("userTokenBalanceBefore: ", userTokenBalanceBefore);

            await exchange.removeLiquidity(toWei(100));

            expect(await exchange.getReserve()).to.equal(toWei(0));
            expect(await getBalance(exchangeAddress)).to.equal(toWei(0));

            const userEtherBalanceAfter = await getBalance(owner.address);
            const userTokenBalanceAfter = await token.balanceOf(owner.address);

            // console.log("userEtherBalanceAfter: ", userEtherBalanceAfter);
            // console.log("userTokenBalanceAfter: ", userTokenBalanceAfter);

            expect(
                fromWei((userEtherBalanceAfter - userEtherBalanceBefore))
            ).to.equal("99.999999999949432"); // 100 - gas fees

            expect(
                fromWei((userTokenBalanceAfter - userTokenBalanceBefore))
            ).to.equal("200.0");
        });

        it("pays for provided liquidity", async () => {
            const userEtherBalanceBefore = await getBalance(owner.address);
            const userTokenBalanceBefore = await token.balanceOf(owner.address);

            await exchange
                .connect(user)
                .ethToTokenSwap(toWei(18), { value: toWei(10) });

            await exchange.removeLiquidity(toWei(100));

            expect(await exchange.getReserve()).to.equal(toWei(0));
            expect(await getBalance(exchangeAddress)).to.equal(toWei(0));
            expect(fromWei(await token.balanceOf(user.address))).to.equal(
                "18.01637852593266606"
            );

            const userEtherBalanceAfter = await getBalance(owner.address);
            const userTokenBalanceAfter = await token.balanceOf(owner.address);

            expect(
                fromWei((userEtherBalanceAfter - userEtherBalanceBefore))
            ).to.equal("109.999999999949432"); // 110 - gas fees

            expect(
                fromWei((userTokenBalanceAfter - userTokenBalanceBefore))
            ).to.equal("181.98362147406733394");
        });

        it("burns LP-tokens", async () => {
            await expect(() =>
                exchange.removeLiquidity(toWei(25))
            ).to.changeTokenBalance(exchange, owner, toWei(-25));

            expect(await exchange.totalSupply()).to.equal(toWei(75));
        });

        it("doesn't allow invalid amount", async () => {
            await expect(exchange.removeLiquidity(toWei(100.1))).to.be.revertedWithCustomError(
                exchange,
                "ERC20InsufficientBalance"
            );
        });
    });
})