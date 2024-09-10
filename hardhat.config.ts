import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-web3-v4";
import { ethers } from "ethers";


const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: {
        accountsBalance: ethers.parseEther("1000000").toString(),
      },
      gasPrice: 1000,
      initialBaseFeePerGas: 0,
    },
  },
  solidity: "0.8.24",
};

export default config;
