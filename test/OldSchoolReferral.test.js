const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const OldSchoolReferral = artifacts.require('OldSchoolReferral');

contract('OldSchoolReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.oldSchoolReferral = await OldSchoolReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.oldSchoolReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.oldSchoolReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.oldSchoolReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.oldSchoolReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.oldSchoolReferral.operators(operator)).valueOf(), true);

        await this.oldSchoolReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.oldSchoolReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.oldSchoolReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.oldSchoolReferral.operators(operator)).valueOf(), false);
        await this.oldSchoolReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.oldSchoolReferral.operators(operator)).valueOf(), true);

        await this.oldSchoolReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.oldSchoolReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.oldSchoolReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.oldSchoolReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.oldSchoolReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.oldSchoolReferral.referralsCount(referrer)).valueOf(), '0');

        await this.oldSchoolReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.oldSchoolReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.oldSchoolReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.oldSchoolReferral.referralsCount(bob)).valueOf(), '0');
        await this.oldSchoolReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.oldSchoolReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.oldSchoolReferral.getReferrer(alice)).valueOf(), referrer);

        await this.oldSchoolReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.oldSchoolReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.oldSchoolReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.oldSchoolReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.oldSchoolReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.oldSchoolReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.oldSchoolReferral.operators(operator)).valueOf(), true);

        await this.oldSchoolReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.oldSchoolReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.oldSchoolReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.oldSchoolReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.oldSchoolReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.oldSchoolReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.oldSchoolReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.oldSchoolReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
