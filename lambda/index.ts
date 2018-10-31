"use strict";

import * as Alexa from 'ask-sdk-core';
import * as Adapter from 'ask-sdk-s3-persistence-adapter'; // Load S3 Persistence Adapter module
import { IntentRequest } from 'ask-sdk-model';

const i18n = require('i18next'); 
const sprintf = require('i18next-sprintf-postprocessor'); 

const LaunchRequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput: Alexa.HandlerInput) {
    requestLogger(handlerInput, 'LaunchRequestHandler');

    const {t} = handlerInput.attributesManager.getRequestAttributes();
    const speechOutput = t('WELCOME');
    const reprompt = t('ASK_ORDER');
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
    const attributes = await attributesManager.getPersistentAttributes();
    console.log(`attributes(before save): ${JSON.stringify(attributes)}`);
    attributes.drink = drink;
    attributesManager.setPersistentAttributes(attributes);
    await attributesManager.savePersistentAttributes();

    const {t} = attributesManager.getRequestAttributes();
    const speechOutput = t('ACCEPT_ORDER', drink);
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

    const {attributesManager} = handlerInput;
    const attributes = await attributesManager.getPersistentAttributes();
    console.log(`attributes: ${JSON.stringify(attributes)}`);

    const {t} = attributesManager.getRequestAttributes();
    const drink: string  = attributes.drink;
    if (drink) {
      const speechOutput = t('ACCEPT_REGULAR_ORDER', drink);
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withShouldEndSession(true)
        .getResponse();
    } else {
      const speechOutput = t('YOU_ARE_NOT_A_REGULAR_CUSTOMER');
      const reprompt = t('ASK_ORDER');
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
      const {t} = handlerInput.attributesManager.getRequestAttributes();
      const message = t('ERROR');
      return handlerInput.responseBuilder
          .speak(message)
          .withShouldEndSession(true)
          .getResponse()
  }
};

const languageStrings = {
  'en' : require('./i18n/en'),
  'ja' : require('./i18n/ja'),
}

const LocalizationInterceptor = {
  process(handlerInput: Alexa.HandlerInput) {
      const {request} = handlerInput.requestEnvelope;
      const locale = (request.type === 'LaunchRequest' || request.type === 'IntentRequest') ? request.locale : 'en';
      const localizationClient = i18n.use(sprintf).init({
          lng: locale,
          fallbackLng: 'en', // fallback to EN if locale doesn't exist
          resources: languageStrings
      });

      localizationClient.localize = function () {
          const args = arguments;
          let values = [];

          for (var i = 1; i < args.length; i++) {
              values.push(args[i]);
          }
          const value = i18n.t(args[0], {
              returnObjects: true,
              postProcess: 'sprintf',
              sprintf: values
          });

          // TODO: Make "get one randomly" logic replaceable
          if (Array.isArray(value)) {
              return value[Math.floor(Math.random() * value.length)];
          } else {
              return value;
          }
      }

      const attributes = handlerInput.attributesManager.getRequestAttributes();
      attributes.t = function (...args: any[]) { // pass on arguments to the localizationClient
          return localizationClient.localize(...args);
      };
  },
};

// Instantiate S3PersistenceAdapter object
const S3BUCKET_NAME = process.env['S3BUCKET_NAME'] as string;
const config = {
  bucketName: S3BUCKET_NAME
};
const S3Adapter = new Adapter.S3PersistenceAdapter(config);

// The main process as a Lambda function
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    OrderIntentHandler,
    RegularOrderIntentHandler
  )
  .addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withPersistenceAdapter(S3Adapter) // Set an S3PersistenceAdapter to the SkillBuilder
  .lambda();

const requestLogger = (handlerInput: Alexa.HandlerInput, label: string) => {
  console.log(`${label}: request: ${JSON.stringify(handlerInput.requestEnvelope)}`);
}
