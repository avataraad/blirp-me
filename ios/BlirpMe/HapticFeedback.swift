import UIKit

@objc(HapticFeedback)
class HapticFeedback: NSObject {
  
  @objc
  func impact(_ style: String) {
    DispatchQueue.main.async {
      if #available(iOS 10.0, *) {
        var impactStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light
        
        switch style {
        case "light":
          impactStyle = .light
        case "medium":
          impactStyle = .medium
        case "heavy":
          impactStyle = .heavy
        default:
          impactStyle = .light
        }
        
        let generator = UIImpactFeedbackGenerator(style: impactStyle)
        generator.prepare()
        generator.impactOccurred()
      }
    }
  }
  
  @objc
  func notification(_ type: String) {
    DispatchQueue.main.async {
      if #available(iOS 10.0, *) {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        
        switch type {
        case "success":
          generator.notificationOccurred(.success)
        case "warning":
          generator.notificationOccurred(.warning)
        case "error":
          generator.notificationOccurred(.error)
        default:
          generator.notificationOccurred(.success)
        }
      }
    }
  }
  
  @objc
  func selection() {
    DispatchQueue.main.async {
      if #available(iOS 10.0, *) {
        let generator = UISelectionFeedbackGenerator()
        generator.prepare()
        generator.selectionChanged()
      }
    }
  }
}