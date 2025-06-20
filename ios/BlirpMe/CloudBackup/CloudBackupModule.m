//
//  CloudBackupModule.m
//  BlirpMe
//
//  Objective-C bridge for CloudBackupModule
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CloudBackupModule, NSObject)

RCT_EXTERN_METHOD(register:(NSString *)tag
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(writeData:(NSString *)credentialID
                  privateKey:(NSString *)privateKey
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(readData:(NSString * _Nullable)credentialID
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(getKnownCredentials:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(setKnownCredentials:(NSArray<NSString *> *)credentials
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(addKnownCredential:(NSString *)credential
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end