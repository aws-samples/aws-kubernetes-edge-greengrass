import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_ssm as ssm } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import { custom_resources as cr } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { CfnOutput } from 'aws-cdk-lib';

export class K3SBootstrapStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // First create an Amazon S3 bucket
        
        const s3Bucket = new s3.Bucket(this, 'kubernetes-config', {
            versioned: true
        });
        
        // Now we have to write the bucket name to SSM Parameter Store
        
        new ssm.StringParameter(this, 'bucketName', {
            parameterName: '/k3s/kubernetes/s3-bucket',
            stringValue: s3Bucket.bucketName
        });
        
        // Second create SSM activation for Raspberry Pi

        const managedInstanceRole = new iam.Role(this, 'managed-instance-role', {
            assumedBy: new iam.ServicePrincipal('ssm.amazonaws.com')
        })

        managedInstanceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

        const customResource = new cr.AwsCustomResource(this, 'activation-custom-resource', {
            installLatestAwsSdk: true,
            policy:  cr.AwsCustomResourcePolicy.fromStatements( [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ssm:CreateActivation',
                        'ssm:DeleteActivation'
                        ],
                    resources: ['*']
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['iam:PassRole'],
                    resources: [ managedInstanceRole.roleArn ]
                })
            ]),
            onCreate: {
                service: 'SSM',
                action: 'createActivation',
                parameters: {
                    IamRole: managedInstanceRole.roleName,
                },
                physicalResourceId: cr.PhysicalResourceId.fromResponse('ActivationId')
            },
            onDelete: {
                service: 'SSM',
                action: 'deleteActivation',
                parameters: {
                    ActivationId: new cr.PhysicalResourceIdReference(),
                }
            },
        });

        new ssm.StringParameter(this, 'activation-id', {
            parameterName: '/k3s/iot/ssm-activation-id',
            stringValue: customResource.getResponseField('ActivationId')
        });
        
        new ssm.StringParameter(this, 'activationCode', {
            parameterName: '/k3s/iot/ssm-activation-code',
            stringValue: customResource.getResponseField('ActivationCode')
        });
        
        const secret = new secretsmanager.Secret(this, 'activation-secret', {secretName: 'k3s-activation-secret'});

        // we need to use escape hatches to set the secret value. See https://github.com/aws/aws-cdk/issues/5810#issuecomment-672736662
        const cfnSecret = secret.node.defaultChild as secretsmanager.CfnSecret;
    
        
        cfnSecret.generateSecretString = undefined;
        cfnSecret.secretString = JSON.stringify( {
            'activation-id': customResource.getResponseField('ActivationId'),
            'activation-code' : customResource.getResponseField('ActivationCode')
        });

        secret.grantRead(managedInstanceRole);

        new CfnOutput(this, 'secret-name-output', {
            exportName: 'activation-id-secret-name',
            value: secret.secretName
        })

    }
}