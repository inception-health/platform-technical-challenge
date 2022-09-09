import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2Targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

import * as path from "path";

export class ExampleCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const network = new ec2.Vpc(this, "challenge-network", {
      cidr: "10.0.0.0/16",
    });

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "hz", {
      zoneName: "jake-sandbox.ihengine.com",
      hostedZoneId: "Z07252961CXXYMJEGGB16",
    });

    const starwarsUrl = setupStarwars(this, network, hostedZone)

    const table = new dynamodb.Table(this, 'challenge-dynamo-table', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const backendSg = new ec2.SecurityGroup(this, 'challenge-app-sg', {
      vpc: network,
      allowAllOutbound: true,
    });

    const backend = new lambda.DockerImageFunction(this, 'challenge-app', {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../app')),
      environment: {
        "DYNAMO_TABLE_NAME": table.tableName,
        "STARWARS_API_URL": starwarsUrl,
      },
      vpc: network,
      securityGroups: [backendSg],
      timeout: cdk.Duration.seconds(25),
    });

    table.grantReadWriteData(backend);

    const backendGateway = new apigateway.LambdaRestApi(this, 'challenge-apigateway', {
      handler: backend,
    });
  }
}

function setupStarwars(scope: Construct, network: ec2.IVpc, hostedZone: route53.IHostedZone): string {
  const starwarsHostname = "starwars.example-cdk.internal.jake-sandbox.ihengine.com"
  const starwarsBackend = new lambda.DockerImageFunction(scope, 'starwars-api', {
    code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../starwars-api')),
    timeout: cdk.Duration.seconds(25),
  });

  const starwarsCert = new acm.Certificate(scope, "Certificate", {
    domainName: starwarsHostname,
    validation: acm.CertificateValidation.fromDns(hostedZone),
  });

  const starwarsLb = new elbv2.ApplicationLoadBalancer(scope, "starwars-lb", {
    vpc: network,
    internetFacing: false,
  });

  const starwarsListenerHTTPS = starwarsLb.addListener("HTTPSListener", {
    port: 443,
    certificates: [starwarsCert],
  });

  // Add a target with the AWS Lambda function to the listener
  starwarsListenerHTTPS.addTargets("HTTPSListenerTargets", {
    targets: [new elbv2Targets.LambdaTarget(starwarsBackend)],
    healthCheck: {
      enabled: true,
    },
  });
  
  starwarsLb.addRedirect();

  const starwarsDNSRecord = new route53.ARecord(scope, "starwars-lb-record", {
    recordName: starwarsHostname,
    zone: hostedZone,
    target: route53.RecordTarget.fromAlias(
      new route53targets.LoadBalancerTarget(starwarsLb)
    ),
  });

  return `https://${starwarsDNSRecord.domainName}`
}