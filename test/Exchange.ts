import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
const toWei = (value: bigint | number) => hre.ethers.parseEther(value.toString());

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

        return { token, exchange, owner, user, tokenAddress, exchangeAddress };
    }

    describe("addLiquidity", function () {
        it("add liquidity", async function () {
            const { token, exchange, tokenAddress, exchangeAddress } = await loadFixture(deployExchangeFixture);
            await token.approve(exchangeAddress, toWei(200));
            await exchange.addLiquidity(toWei(200), { value: toWei(100) });
            expect(await hre.ethers.provider.getBalance(exchangeAddress)).to.equal(toWei(100));
            expect(await exchange.getReserve()).to.equal(toWei(200));
        });
    })
})