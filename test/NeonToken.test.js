const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const NeonToken = artifacts.require('NeonToken');

contract('NeonToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.neon = await NeonToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.neon.owner()), owner);
        assert.equal((await this.neon.operator()), owner);

        await expectRevert(this.neon.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.neon.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.neon.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.neon.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.neon.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.neon.updateOldSchoolRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.neon.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.neon.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.neon.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        await expectRevert(this.neon.transferOperator(this.zeroAddress, { from: operator }), 'NEON::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        assert.equal((await this.neon.transferTaxRate()).toString(), '500');
        assert.equal((await this.neon.burnRate()).toString(), '20');

        await this.neon.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.neon.transferTaxRate()).toString(), '0');
        await this.neon.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.neon.transferTaxRate()).toString(), '1000');
        await expectRevert(this.neon.updateTransferTaxRate(1001, { from: operator }), 'NEON::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.neon.updateBurnRate(0, { from: operator });
        assert.equal((await this.neon.burnRate()).toString(), '0');
        await this.neon.updateBurnRate(100, { from: operator });
        assert.equal((await this.neon.burnRate()).toString(), '100');
        await expectRevert(this.neon.updateBurnRate(101, { from: operator }), 'NEON::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        await this.neon.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.neon.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '0');

        await this.neon.transfer(bob, 12345, { from: alice });
        assert.equal((await this.neon.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.neon.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '494');

        await this.neon.approve(carol, 22345, { from: alice });
        await this.neon.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.neon.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.neon.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        await this.neon.mint(alice, 10000000, { from: owner });
        assert.equal((await this.neon.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '0');

        await this.neon.transfer(bob, 19, { from: alice });
        assert.equal((await this.neon.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.neon.balanceOf(bob)).toString(), '19');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        assert.equal((await this.neon.transferTaxRate()).toString(), '500');
        assert.equal((await this.neon.burnRate()).toString(), '20');

        await this.neon.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.neon.transferTaxRate()).toString(), '0');

        await this.neon.mint(alice, 10000000, { from: owner });
        assert.equal((await this.neon.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '0');

        await this.neon.transfer(bob, 10000, { from: alice });
        assert.equal((await this.neon.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.neon.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        assert.equal((await this.neon.transferTaxRate()).toString(), '500');
        assert.equal((await this.neon.burnRate()).toString(), '20');

        await this.neon.updateBurnRate(0, { from: operator });
        assert.equal((await this.neon.burnRate()).toString(), '0');

        await this.neon.mint(alice, 10000000, { from: owner });
        assert.equal((await this.neon.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '0');

        await this.neon.transfer(bob, 1234, { from: alice });
        assert.equal((await this.neon.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.neon.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        assert.equal((await this.neon.transferTaxRate()).toString(), '500');
        assert.equal((await this.neon.burnRate()).toString(), '20');

        await this.neon.updateBurnRate(100, { from: operator });
        assert.equal((await this.neon.burnRate()).toString(), '100');

        await this.neon.mint(alice, 10000000, { from: owner });
        assert.equal((await this.neon.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '0');

        await this.neon.transfer(bob, 1234, { from: alice });
        assert.equal((await this.neon.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.neon.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.neon.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.neon.balanceOf(this.neon.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.neon.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.neon.maxTransferAmount()).toString(), '0');

        await this.neon.mint(alice, 1000000, { from: owner });
        assert.equal((await this.neon.maxTransferAmount()).toString(), '5000');

        await this.neon.mint(alice, 1000, { from: owner });
        assert.equal((await this.neon.maxTransferAmount()).toString(), '5005');

        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        await this.neon.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.neon.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        assert.equal((await this.neon.isExcludedFromAntiWhale(operator)), false);
        await this.neon.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.neon.isExcludedFromAntiWhale(operator)), true);

        await this.neon.mint(alice, 10000, { from: owner });
        await this.neon.mint(bob, 10000, { from: owner });
        await this.neon.mint(carol, 10000, { from: owner });
        await this.neon.mint(operator, 10000, { from: owner });
        await this.neon.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.neon.maxTransferAmount()).toString(), '250');
        await expectRevert(this.neon.transfer(bob, 251, { from: alice }), 'NEON::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.neon.approve(carol, 251, { from: alice });
        await expectRevert(this.neon.transferFrom(alice, carol, 251, { from: carol }), 'NEON::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.neon.transfer(bob, 250, { from: alice });
        await this.neon.transferFrom(alice, carol, 250, { from: carol });

        await this.neon.transfer(this.burnAddress, 251, { from: alice });
        await this.neon.transfer(operator, 251, { from: alice });
        await this.neon.transfer(owner, 251, { from: alice });
        await this.neon.transfer(this.neon.address, 251, { from: alice });

        await this.neon.transfer(alice, 251, { from: operator });
        await this.neon.transfer(alice, 251, { from: owner });
        await this.neon.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.neon.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.neon.swapAndLiquifyEnabled()), false);

        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        await this.neon.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.neon.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.neon.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.neon.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.neon.transferOperator(operator, { from: owner });
        assert.equal((await this.neon.operator()), operator);

        await this.neon.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.neon.minAmountToLiquify()).toString(), '100');
    });
});
