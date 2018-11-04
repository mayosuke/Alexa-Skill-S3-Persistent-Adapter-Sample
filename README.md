# Alexa Skill Sample for S3 Persistent Adapter
## How to deploy the sample skill to AWS Lambda
- `npm install -g typescript`
- `cd` to lambda/
- npm install
- run `tsc` command
- `zip lambda.zip index.js node_modules/ -r`
- upload lambda.zip to AWS Lambda

**You need to create an S3 bucket for the skill before invoking the lambda since the S3PersistentAdapter create no S3 bucket.**

## Reference

- [How to store persistence attributes into Amazon S3 using Alexa Skills Kit SDK for Node.js ｜ DevelopersIO](https://dev.classmethod.jp/cloud/aws/ask-sdk-for-node-js-s3-persistence-adapter-en/)
