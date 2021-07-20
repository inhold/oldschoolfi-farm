// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./libs/IBEP20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

interface IMasterChef {
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 rewardLockedUp;
        uint256 nextHarvestUntil;
    }

    function userInfo(uint256 pid, address user) external view returns (UserInfo memory);
}

contract NeonVoteProxy {
    using SafeMath for uint256;

    // Neon Token
    address public neon = 0x1f546aD641B56b86fD9dCEAc473d1C7a357276B7;
    // Master Chef
    address public masterChef = 0x058451C62B96c594aD984370eDA8B6FD7197bbd4;
    uint256 public neonPoolPid = 9;
    // Trading Pairs
    address public neonBNB = 0xC24AD5197DaeFD97DF28C70AcbDF17d9fF92a49B;
    uint256 public neonBNBFarmPid = 17;
    address public neonBUSD = 0x9287F5Ad55D7eE8EAE90B865718EB9A7cF3fb71A;
    uint256 public neonBUSDFarmPid = 16;
    // Vaults
    address public autoSharkNeonPool = 0x2Bc66d715FB0887A8708eCa5d83826eB063ba551;

    function decimals() external pure returns (uint8) {
        return uint8(18);
    }

    function name() external pure returns (string memory) {
        return "NeonToken Vote Proxy";
    }

    function symbol() external pure returns (string memory) {
        return "NEON-VOTE";
    }

    function totalSupply() external view returns (uint256) {
        return IBEP20(neon).totalSupply();
    }

    function balanceOf(address _voter) external view returns (uint256) {
        uint256 balance;

        // neon in wallet
        balance = balance.add(IBEP20(neon).balanceOf(_voter));
        // neon in neon pool
        balance = balance.add(IMasterChef(masterChef).userInfo(neonPoolPid, _voter).amount);
        // neon in NEON-BNB liquidity pool
        balance = balance.add(balanceInLiquidityPoolAndFarm(neonBNB, neonBNBFarmPid, _voter));
        // neon in NEON-BUSD liquidity pool
        balance = balance.add(balanceInLiquidityPoolAndFarm(neonBUSD, neonBUSDFarmPid, _voter));
        // neon in vaults
        balance = balance.add(IBEP20(autoSharkNeonPool).balanceOf(_voter));

        return balance;
    }

    function balanceInLiquidityPoolAndFarm(address pair, uint256 pid, address _voter) private view returns (uint256) {
        uint256 lpTotalSupply = IBEP20(pair).totalSupply();
        uint256 voterLpBalance = IBEP20(pair).balanceOf(_voter).add(IMasterChef(masterChef).userInfo(pid, _voter).amount);
        uint256 neonInLp = IBEP20(neon).balanceOf(pair);

        if (lpTotalSupply > 0) {
            return voterLpBalance.mul(1e8).div(lpTotalSupply).mul(neonInLp).div(1e8);
        }

        return 0;
    }
}
