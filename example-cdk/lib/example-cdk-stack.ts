import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

import * as path from "path";

export class ExampleCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const rootDomain = "jake-sandbox.ihengine.com";
    const backendSubdomain = "api.example-cdk.internal";

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "challenge-hostedzone", {
      zoneName: rootDomain,
      hostedZoneId: "Z07252961CXXYMJEGGB16",
    });

    const table = new dynamodb.Table(this, 'challenge-dynamo-table', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const backend = new lambda.DockerImageFunction(this, 'challenge-backend-handler', {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../app'), {
        cmd: ["index.backend"],
        file: "Dockerfile.lambda",
      }),
      environment: {
        "DYNAMO_TABLE_NAME": table.tableName,
      },
      timeout: cdk.Duration.seconds(25),
    });
    const backendCert = new acm.Certificate(this, 'challenge-backend-cert', {
      domainName: `${backendSubdomain}.${rootDomain}`,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const backendGateway = new apigateway.LambdaRestApi(this, 'challenge-backend-apigateway', {
      handler: backend,
      domainName: {
        domainName: `${backendSubdomain}.${rootDomain}`,
        certificate: backendCert,
      }
    });

    new route53.ARecord(this, "challenege-backend-dnsrecord", {
      zone: hostedZone,
      recordName: backendSubdomain,
      target: route53.RecordTarget.fromAlias(
        new route53targets.ApiGateway(backendGateway)
      ),
    });

    table.grantReadData(backend);

    new cdk.CfnOutput(this, "challenge-api-gateway-url", {
      value: `https://${backendSubdomain}.${rootDomain}`
    })

    const checkinHandler = new lambda.DockerImageFunction(this, 'challenge-checkin-handler', {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../app'), {
        cmd: ["index.checkin"],
        file: "Dockerfile.lambda"
      }),
      environment: {
        "DYNAMO_TABLE_NAME": table.tableName,
      },
      timeout: cdk.Duration.seconds(25),
    });
    table.grantWriteData(checkinHandler);

    const runCheckinRule = new events.Rule(this, 'challenge-checkin-runner', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
    });
    runCheckinRule.addTarget(new eventTargets.LambdaFunction(checkinHandler))
  }
}
