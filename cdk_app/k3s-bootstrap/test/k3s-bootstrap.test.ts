import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as K3SBootstrap from '../lib/k3s-bootstrap-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new K3SBootstrap.K3SBootstrapStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
