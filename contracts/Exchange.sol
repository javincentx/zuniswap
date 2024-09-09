// contracts/Exchange.sol
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract Exchange {
    address public tokenAddress;

    constructor(address token_) {
        require(token_ != address(0), "invalid token address");

        tokenAddress = token_;
    }

    function addLiquidity(uint256 tokenAmount) public payable {
        IERC20 token = IERC20(tokenAddress);
        token.transferFrom(msg.sender, address(this), tokenAmount);
    }

    function getReserve() public view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    function getPrice(
        uint256 inputReserve,
        uint256 outputReserve
    ) public pure returns (uint256) {
        require(inputReserve > 0 && outputReserve > 0, "insufficent reserve");
        return (inputReserve * 1000) / outputReserve;
    }

    function getAmount(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) private pure returns (uint256) {
        // console.log(inputAmount, inputReserve, outputReserve);
        require(inputReserve > 0 && outputReserve > 0, "invalid reserves");

        return (inputAmount * outputReserve) / (inputReserve + inputAmount);
    }

    function getTokenAmount(uint256 ethSold_) public view returns (uint256) {
        require(ethSold_ > 0, "ethSold is too small");
        uint256 tokenReserve = getReserve();
        uint256 etherReserve = address(this).balance;
        return getAmount(ethSold_, etherReserve, tokenReserve);
    }

    function getEthAmount(uint256 tokensSold_) public view returns (uint256) {
        require(tokensSold_ > 0, "tokensSold is too small");
        uint256 tokenReserve = getReserve();
        uint256 etherReserve = address(this).balance;
        return getAmount(tokensSold_, tokenReserve, etherReserve);
    }

    function ethToTokenSwap(uint256 minTokens_) public payable {
        uint256 tokenReserve = getReserve();
        uint256 tokensBought = getAmount(
            msg.value,
            address(this).balance - msg.value,
            tokenReserve
        );
        require(tokensBought >= minTokens_, "insufficient output token amount");
        IERC20(tokenAddress).transfer(msg.sender, tokensBought);
    }

    function tokenToEthSwap(uint256 tokensSold_, uint256 minEth_) public {
        uint256 tokenReserve = getReserve();
        uint256 ethBought = getAmount(
            tokensSold_,
            tokenReserve,
            address(this).balance
        );

        require(ethBought >= minEth_, "insufficient output amount");

        IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            tokensSold_
        );
        payable(msg.sender).transfer(ethBought);
    }
}
