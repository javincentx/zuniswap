import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AddressLike, BigNumberish, Numeric } from "ethers";
import { expect } from "chai";
import hre from "hardhat";

const toWei = (value: Numeric) => hre.ethers.parseEther(value.toString());
const fromWei = (value: BigNumberish) => hre.ethers.formatEther(typeof value === "string" ? value : value.toString());
const getBalance = (address: AddressLike) => hre.ethers.provider.getBalance(address);

describe("Exchange", function () {

    async function deployExchangeFixture() {
        const [owner, user] = await hre.ethers.getSigners();
        const Token = await hre.ethers.getContractFactory("Token");
        const token = await Token.deploy("DogeToken", "DOGE", toWei(1000000));
        await token.waitForDeployment();
        const tokenAddress = await token.getAddress();
        console.log("Token Contract deployed to address:", tokenAddress);

        const Exchange = await hre.ethers.getContractFactory("Exchange");
        const exchange = await Exchange.deploy(tokenAddress);
        await exchange.waitForDeployment();
        const exchangeAddress = await exchange.getAddress();
        console.log("Exchange Contract deployed to address:", exchangeAddress);

        await token.approve(exchangeAddress, toWei(2000));
        await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });

        return { token, exchange, owner, user, tokenAddress, exchangeAddress };
    }

    describe("addLiquidity", function () {
        it("add liquidity", async function () {
            const { token, exchange, tokenAddress, exchangeAddress } = await loadFixture(deployExchangeFixture);
            expect(await getBalance(exchangeAddress)).to.equal(toWei(1000));
            expect(await exchange.getReserve()).to.equal(toWei(2000));
        });
    });


    describe("getPrice", function () {
        it("return correct price", async function () {
            const { token, exchange, tokenAddress, exchangeAddress } = await loadFixture(deployExchangeFixture);
            const tokenReserve = await exchange.getReserve();
            const etherReserve = await getBalance(exchangeAddress);

            expect(await exchange.getPrice(etherReserve, tokenReserve)).to.eq(500);

            // token per ETH
            expect(await exchange.getPrice(tokenReserve, etherReserve)).to.eq(2000);
        })
    })


    describe("getTokenAmount", function () {
        it("return correct token amount", async function () {
            const { token, exchange, tokenAddress, exchangeAddress } = await loadFixture(deployExchangeFixture);
            let tokensOut = await exchange.getTokenAmount(toWei(1));
            expect(fromWei(tokensOut)).to.equal("1.998001998001998001");

            tokensOut = await exchange.getTokenAmount(toWei(100));
            expect(fromWei(tokensOut)).to.equal("181.818181818181818181");

            tokensOut = await exchange.getTokenAmount(toWei(1000));
            expect(fromWei(tokensOut)).to.equal("1000.0");
        })
    })

    describe("getEthAmount", function () {
        it("return correct ether amount", async function () {
            const { token, exchange, tokenAddress, exchangeAddress } = await loadFixture(deployExchangeFixture);
            let ethOut = await exchange.getEthAmount(toWei(2));
            expect(fromWei(ethOut)).to.equal("0.999000999000999");

            ethOut = await exchange.getEthAmount(toWei(100));
            expect(fromWei(ethOut)).to.equal("47.619047619047619047");

            ethOut = await exchange.getEthAmount(toWei(2000));
            expect(fromWei(ethOut)).to.equal("500.0");
        })
    })
})