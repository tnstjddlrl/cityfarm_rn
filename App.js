import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import WebView from 'react-native-webview';

import * as RNIap from 'react-native-iap';
import { purchaseErrorListener, purchaseUpdatedListener } from 'react-native-iap';

import messaging from '@react-native-firebase/messaging';
import { requestMultiple, PERMISSIONS } from 'react-native-permissions';
import DeviceInfo from 'react-native-device-info';
import PushNotification from 'react-native-push-notification';

var cbc;

const productIds = Platform.select({
  ios: [
    'test2'
  ],
  android: [
    'test2', 'com.cityfarm.test'
  ]
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////
async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////

const App = () => {
  const [uri, setUri] = useState({ uri: 'https://jheon2743.cafe24.com/' })
  const [phone, setPhone] = useState('')

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      function () {
        if (cbc && rnw) {
          rnw.goBack();
          return true;
        } else {
          Alert.alert('앱 종료', '앱을 종료하시겠습니까?',
            [
              {
                text: "취소",
                onPress: () => console.log("Cancel Pressed"),
                style: "cancel"
              },
              { text: "확인", onPress: () => BackHandler.exitApp() }
            ])
        }
        return true;
      }
    );
    return () => backHandler.remove();
  }, []);


  useEffect(() => {
    requestMultiple([
      PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      // PERMISSIONS.ANDROID.READ_PHONE_NUMBERS,
      // PERMISSIONS.ANDROID.READ_PHONE_STATE,
      PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
      PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE
    ]).then((statuses) => {
      console.log('ACCESS_COARSE_LOCATION', statuses[PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION]);
      console.log('ACCESS_FINE_LOCATION', statuses[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]);
      // console.log('READ_PHONE_NUMBERS', statuses[PERMISSIONS.ANDROID.READ_PHONE_NUMBERS]);
      // console.log('READ_PHONE_STATE', statuses[PERMISSIONS.ANDROID.READ_PHONE_STATE]);
    }).then(() => {
      DeviceInfo.getPhoneNumber().then((phoneNumber) => {
        console.log(`폰번호 : ${phoneNumber.replace('+82', '0')}`)
        setPhone(phoneNumber.replace('+82', '0'))
      });
    })
  }, [])


  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  //토큰받아오기
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  const [pushToken, setPushToken] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)

  const handlePushToken = useCallback(async () => {
    const enabled = await messaging().hasPermission()
    if (enabled) {
      const fcmToken = await messaging().getToken()
      if (fcmToken) setPushToken(fcmToken)
    } else {
      const authorized = await messaging.requestPermission()
      if (authorized) setIsAuthorized(true)
    }
  }, [])

  const saveDeviceToken = useCallback(async () => {
    if (isAuthorized) {
      const currentFcmToken = await firebase.messaging().getToken()
      if (currentFcmToken !== pushToken) {
        return saveTokenToDatabase(currentFcmToken)
      }
      return messaging().onTokenRefresh((token) => saveTokenToDatabase(token))
    }
  }, [pushToken, isAuthorized])

  useEffect(() => {
    requestUserPermission()
    try {
      handlePushToken()
      saveDeviceToken()

    } catch (error) {
      console.log(error)
      Alert.alert('토큰 받아오기 실패')
    }

  }, [])

  // setTimeout(() => {
  //   console.log(pushToken)
  // }, 1000);
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log(JSON.stringify(remoteMessage.notification.title));

      // Alert.alert('A new FCM message arrived!', JSON.stringify(remoteMessage));
      PushNotification.localNotification({
        channelId: "fcm_alert",
        invokeApp: true,
        title: remoteMessage.notification.title, // (optional)
        message: remoteMessage.notification.body, // (required)
      })


    });

    return unsubscribe;
  }, []);
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////



  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    RNIap.initConnection().then((connection) => {
      if (Platform.OS === 'android') {
        RNIap.flushFailedPurchasesCachedAsPendingAndroid();
      } else {
        RNIap.clearTransactionIOS();
      }

      purchaseErrorListener((err) => {
        console.log('결제 거부2')
        console.log('Purchase/fail 전송완료!')
        rnw.postMessage('Purchase/fail')
      })

      purchaseUpdatedListener((products) => {
        try {
          // console.log(products)
          RNIap.finishTransaction(products, true)
          rnw.postMessage('Purchase/success')
          console.log('Purchase/success 전송완료2')
          Alert.alert('결제완료')
        } catch (error) {
          console.log('error')
        }
      })
    });

    return () => {
      RNIap.endConnection();
    }
  }, [])
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////

  const requestPurchase = async (sku) => {
    try {
      RNIap.requestPurchase(sku).then((response) => {
        // rnw.postMessage('Purchase/success')
        // console.log('Purchase/success 전송완료')
        // Alert.alert('결제완료')
      });
    } catch (err) {
      console.log(err);
    }
  };


  async function pay(params) {
    try {
      const products = await RNIap.getProducts(params);
      console.log(products)
      return products
    } catch (err) {
      console.warn(err); // standardized err.code and err.message available
    }
  }

  // useEffect(() => {
  //   pay(['com.semicolons.basic']).then((res) => {
  //     requestPurchase('com.semicolons.basic').then((res) => {
  //       console.log('결제테스트');
  //       console.log(res);
  //     })
  //   })
  // }, []) //결제 테스트용

  function onMessage(event) {
    console.log(event.nativeEvent.data)
    // console.log(event.nativeEvent.data.split('/')[1])
    if (event.nativeEvent.data.split('/')[0] == 'BASIC' || event.nativeEvent.data.split('/')[0] == 'PRO') {
      try {
        pay([event.nativeEvent.data.split('/')[1]]).then(() => {
          requestPurchase(event.nativeEvent.data.split('/')[1]).then((response) => {
            console.log('결제 실행')
            // rnw.postMessage('Purchase/success')
            console.log(response);
          })
        }).catch((err) => {
          console.log('결제실패!')
        })
      } catch (error) {
        console.error(error)
        Alert.alert('결제오류', '고객센터에 문의해주세요!')
      }
    }

    if (event.nativeEvent.data == 'phonenumber') {
      if (phone[0] === '+' || phone === '') {
        rnw.postMessage('phonenumber/Foreigner')
        console.log('phonenumber/Foreigner')
      } else {
        rnw.postMessage(`phonenumber/${phone}`)
        console.log(`phonenumber/${phone}`)
      }
    }

    if (event.nativeEvent.data == 'phonetoken') {
      if (pushToken === '' || pushToken === null || pushToken === undefined) {
        rnw.postMessage('phonetoken/null')
        console.log('phonetoken/null')
      } else {
        rnw.postMessage(`phonetoken/${pushToken}`)
        console.log(`phonetoken/${pushToken}`)
      }
    }

  }

  return (
    <SafeAreaView style={{ width: '100%', height: '100%' }}>
      <WebView
        ref={wb => { rnw = wb }}
        onMessage={event => {
          onMessage(event)
          console.log('데이터 받음!')
        }}
        onLoadEnd={() => {
        }}
        pullToRefreshEnabled={true}
        style={{ width: '100%', height: '100%' }}
        onNavigationStateChange={(navState) => { cbc = navState.canGoBack; }}
        geolocationEnabled
        allowUniversalAccessFromFileURLs
        allowFileAccess
        source={uri}></WebView>
    </SafeAreaView>
  )
}
export default App;
