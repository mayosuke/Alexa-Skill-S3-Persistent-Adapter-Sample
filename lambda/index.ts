"use strict";

import * as Alexa from 'ask-sdk-core';
import * as Adapter from 'ask-sdk-s3-persistence-adapter'; // S3 Persistence Adapterモジュールの読み込み
import { IntentRequest } from 'ask-sdk-model';

const LaunchRequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput: Alexa.HandlerInput) {
    requestLogger(handlerInput, 'LaunchRequestHandler');

    const speechOutput = 'いらっしゃいませ。ご注文はどうしますか？コーヒー、紅茶、緑茶、コーラがありますよ。';
    const reprompt = 'コーヒー、紅茶、緑茶、コーラ、どれにしますか？';
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      .getResponse();
  }
};

const OrderIntentHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    const {request} = handlerInput.requestEnvelope;
    return request.type === 'IntentRequest' && request.intent.name === 'OrderIntent';
  },
  async handle(handlerInput: Alexa.HandlerInput) {
    requestLogger(handlerInput, 'OrderIntentHandler');

    const request  = handlerInput.requestEnvelope.request as IntentRequest;
    const drink = (request.intent.slots && request.intent.slots.drink) ? request.intent.slots.drink.value : '';
    console.log(`ordered drink: ${drink}`);

    const {attributesManager} = handlerInput;
    const attributes = await attributesManager.getPersistentAttributes(); // 永続アトリビュートオブジェクトの取得
    console.log(`attributes(before save): ${JSON.stringify(attributes)}`);
    attributes.drink = drink;
    attributesManager.setPersistentAttributes(attributes); // 永続アトリビュートオブジェクトへの値のセット
    await attributesManager.savePersistentAttributes(); // 永続アトリビュートオブジェクトの保存

    const speechOutput = `${drink}ですね。すぐお作りします！`;
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .withShouldEndSession(true)
      .getResponse();
  }
};

const RegularOrderIntentHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    const {request} = handlerInput.requestEnvelope;
    return request.type === 'IntentRequest'
        && (request.intent.name === 'RegularOrderIntent');
  },
  async handle(handlerInput: Alexa.HandlerInput) {
    requestLogger(handlerInput, 'RegularOrderIntentHandler');

    const attributes = await handlerInput.attributesManager.getPersistentAttributes(); //永続アトリビュートオブジェクトを取得する
    console.log(`attributes: ${JSON.stringify(attributes)}`);

    const drink: string  = attributes.drink;
    if (drink) {
      const speechOutput = `わかりました。いつもの${drink}をお作りしますね！`
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withShouldEndSession(true)
        .getResponse();
    } else {
      const speechOutput = 'ご来店ははじめてのようですね！ご注文はどうしますか？コーヒー、紅茶、緑茶、コーラがありますよ。'
      const reprompt = 'コーヒー、紅茶、緑茶、コーラ、どれにしますか？'
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(reprompt)
        .withShouldEndSession(false)
        .getResponse();
    }
  }
};

const ErrorHandler = {
  canHandle (handlerInput: Alexa.HandlerInput) {
      return true;
  },
  handle (handlerInput: Alexa.HandlerInput, error: Error) {
      console.log(`Error handled: ${error.message}`);
      const message = "すみません、なんだかうまくいきませんでした。しばらく時間をおいてからもう一度お試しください。";
      return handlerInput.responseBuilder
          .speak(message)
          .withShouldEndSession(true)
          .getResponse()
  }
};

// S3PersistenceAdapterオブジェクトの生成
const S3BUCKET_NAME = process.env['S3BUCKET_NAME'] as string;
const config = {
  bucketName: S3BUCKET_NAME
};
const S3Adapter = new Adapter.S3PersistenceAdapter(config);

// Lambda関数のメイン処理
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    OrderIntentHandler,
    RegularOrderIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withPersistenceAdapter(S3Adapter) // SkillBuilderにS3PersistenceAdapterを設定する
  .lambda();

const requestLogger = (handlerInput: Alexa.HandlerInput, label: string) => {
  console.log(`${label}: request: ${JSON.stringify(handlerInput.requestEnvelope)}`);
}