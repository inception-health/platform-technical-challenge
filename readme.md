# Inception Health Technical Challenge

## What's Included?

### Application

There is an application in the `app/` folder in the root of this repository. It defines two lambda handlers in `index.ts`. 

The first is `checkin` which "checks in" a random patient whenever it is invoked. It requires write access to a dynamodb table. The tablename should be defined in the environment variable `DYNAMO_TABLE_NAME`.

The second is `backend` which generates an http response carrying JSON encoded data representing the last checkin time for each patient. It requires read and describe access to the same dynamodb table used by `checkin`. The tablename should be defined in the environment variable `DYNAMO_TABLE_NAME`.

You should not need to modify this code. The code is expected to be deployed to lambda.

### AWS

Your AWS credentials give you admin access to a sandbox account. You may use any resources you find appropriate.

You have access to an existing hosted zone in route53. The zone id is `Z07252961CXXYMJEGGB16` and the zone name is `jake-sandbox.ihengine.com`. Please do not buy and register a new domain.

## Assignment

* Using the tools and language of your choice, write code that deploys the two applications in `app/` using a single command.
* The backend service should be accessiable via https over the public internet.
* The checkin event handler should be triggered regularly.
* You should not need to make changes to the application code.
* The single command from the user can (and likely will) call a longer shell script, or other configuration management code.
* The script should output the address of the `backend` api.
* Your credentials are attached (including the assigned region). You have admin access to the account. Have fun.

## Evaluation Criteria

* Please don't take more than 3 hours total. If you find yourself running over, write down what you didn't get to so we can discuss it in the review.
* Timekeeping is up to you and we expect your finished response in a reasonable amount of time.
* Source control is expected as well as documentation that should explain how you approached the challenge, what assumptions you've made, and reasoning behind the choices in your approach.
* You are being evaluated based on:
  * Quality of your code and configuration
  * Clarity of your written communication and documentation
  * Understanding of how your code works in our review session.
  * Project presentation.

Please reach out with any questions or clarifications. jake.gaylor@froedtert.com and nick.harris@froedtert.com are here to help.

Good Luck!
