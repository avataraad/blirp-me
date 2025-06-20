#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface RCT_EXTERN_MODULE(HapticFeedback, NSObject)

RCT_EXTERN_METHOD(impact:(NSString *)style)
RCT_EXTERN_METHOD(notification:(NSString *)type)
RCT_EXTERN_METHOD(selection)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end