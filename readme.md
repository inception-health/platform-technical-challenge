# Inception Health Technical Challenge

## Assignment

* Using the tools and language of your choice, write code that deploys the application provided in `app/` using a single command.
* The backend service should be accessiable via https over the public internet.
* The checkin event handler should be triggered regularly by an automated process.
* The single command from the user can (and likely will) call a longer shell script, or other configuration management code.
* The script should output the address of the `backend` api.
* Your credentials are attached (including the assigned region). You have admin access to the account. Have fun.
* We ask that you not use ec2 directly for your solution. However, something like a fargate cluster in which ec2 instances are managed by aws is okay.
* You should not need to make changes to the existing application code. 

## Evaluation Criteria

* Please don't take more than 3 hours total. If you find yourself running over, write down what you didn't get to so we can discuss it in the review.
* Timekeeping is up to you and we expect your finished response in a reasonable amount of time.
* Source control is expected as well as documentation that should explain how you approached the challenge, what assumptions you've made, and reasoning behind the choices in your approach.
* You are being evaluated based on:
  * Quality of your code and configuration
  * Clarity of your written communication and documentation
  * Understanding of how your code works in our review session.
  * Project presentation.

## What's Included?

### AWS Credentials

Your AWS credentials give you admin access to a sandbox account. You may use any resources you find appropriate.

You have access to an existing hosted zone in route53. The zone id is `Z07252961CXXYMJEGGB16` and the zone name is `jake-sandbox.ihengine.com`. Please do not buy and/or register a new domain.

### Application

There is an application in the `app/` folder in the root of this repository. It exports two functions, `checkin` and `backend` from `index.ts`. `checkin` creates a record in dynamodb that represents a patient checking in. `backend` reads the records in dynamodb and returns a JSON encoded message representing the latest checkin time for the known patients.

These functions can be invoked directly from lambda but there is also an express implementation in `express.ts`.

There are two Dockerfiles. First, `Dockerfile.lambda` is for use with lambdas. Second is `Dockerfile.express` which will startup an express server on port 3000 or the port specified by the environment variable `PORT`.

#### Using the applications

You may want to invoke these functions from a web server directly or you may want to set these functions up as lambda handlers. There are some included dockerfiles to make things easier but you don't have to use them.

##### Lambda Handlers

You can build and run the lambda handlers locally using

```
cd app/
docker build -t lambda-handler -f Dockerfile.lambda .
docker run --rm -d -p 8080:8080 \
  -e REGION=us-east-1 \
  -e AWS_PROFILE=sandbox-jake \
  -e DYNAMO_TABLE_NAME=ExampleCdkStack-challengedynamotableD8B7A7F0-JOGVCB23S70N \
  -v $HOME/.aws/:/root/.aws/:ro \
  lambda-handler index.backend
curl -X POST http://localhost:8080/2015-03-31/functions/function/invocations -H 'Content-Type: application/json' -d '"{}"' | python3 -m json.tool
```

##### Express Webserver

You can build and run the express webserver locally using

```
cd app/
docker build -t express-app -f Dockerfile.express .
docker run --rm -d -p 3000:3000 \
  -e REGION=us-east-1 \
  -e AWS_PROFILE=sandbox-jake \
  -e DYNAMO_TABLE_NAME=ExampleCdkStack-challengedynamotableD8B7A7F0-JOGVCB23S70N \
  -e PORT=3000 \
  -v $HOME/.aws/:/root/.aws/:ro \
  express-app
```

# 
The first is `checkin` which "checks in" a random patient whenever it is invoked. It requires write access to a dynamodb table. The tablename should be defined in the environment variable `DYNAMO_TABLE_NAME`. When invoking this lambda handler be sure to set the handler to `index.checkin`. In the express implementation you can send a `POST` request to `/checkin`.

The second is `backend` which generates an http response carrying JSON encoded data representing the last checkin time for each patient. It requires read and describe access to the same dynamodb table used by `checkin`. The tablename should be defined in the environment variable `DYNAMO_TABLE_NAME`. When invoking this lambda handler be sure to set the handler to `index.backend`. In the express implementation you cand a `GET` request to `/`.

You should not need to modify this code. You may use either the lambda or express based version of the app or some combination of the two.

## Closing Remarks

There are no trick questions here. We want to see you deploy something and are excited to talk to you about how you did it.

Please reach out with any questions or if something needs to be clarified. jake.gaylor@froedtert.com and nick.harris@froedtert.com are here to help.

Good Luck!
