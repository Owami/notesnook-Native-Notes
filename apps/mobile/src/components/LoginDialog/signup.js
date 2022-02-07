import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useTracked } from '../../provider';
import { useUserStore } from '../../provider/stores';
import { DDS } from '../../services/DeviceDetection';
import { eSendEvent, ToastEvent } from '../../services/EventManager';
import { clearMessage, setEmailVerifyMessage } from '../../services/Message';
import { db } from '../../utils/database';
import { eCloseLoginDialog, eOpenResultDialog } from '../../utils/Events';
import { SIZE } from '../../utils/SizeUtils';
import { sleep } from '../../utils/TimeUtils';
import umami from '../../utils/umami';
import { ActionIcon } from '../ActionIcon';
import { Button } from '../Button';
import BaseDialog from '../Dialog/base-dialog';
import Input from '../Input';
import { SvgToPngView } from '../ListPlaceholders';
import Heading from '../Typography/Heading';
import Paragraph from '../Typography/Paragraph';
import { SVG } from './background';

export const Signup = ({ changeMode, welcome }) => {
  const [state, dispatch] = useTracked();
  const colors = state.colors;
  const email = useRef();
  const emailInputRef = useRef();
  const passwordInputRef = useRef();
  const password = useRef();
  const confirmPasswordInputRef = useRef();
  const confirmPassword = useRef();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const setUser = useUserStore(state => state.setUser);
  const setLastSynced = useUserStore(state => state.setLastSynced);

  const validateInfo = () => {
    if (!password.current || !email.current || !confirmPassword.current) {
      ToastEvent.show({
        heading: 'All fields required',
        message: 'Fill all the fields and try again',
        type: 'error',
        context: 'local'
      });

      return false;
    }

    return true;
  };

  const signup = async () => {
    if (!validateInfo() || error) return;
    setLoading(true);
    try {
      await db.user.signup(email.toLowerCase(), password);
      let user = await db.user.getUser();
      setUser(user);
      setLastSynced(await db.lastSynced());
      clearMessage();
      setEmailVerifyMessage();
      eSendEvent(eCloseLoginDialog);
      umami.pageView('/account-created', '/welcome/signup');
      await sleep(300);
      eSendEvent(eOpenResultDialog);
    } catch (e) {
      setLoading(false);
      ToastEvent.show({
        heading: 'Signup failed',
        message: e.message,
        type: 'error',
        context: 'local'
      });
    }
  };

  return (
    <>
      {!welcome && (
        <ActionIcon
          name="arrow-left"
          onPress={() => {
            eSendEvent(eCloseLoginDialog);
          }}
          color={colors.pri}
          customStyle={{
            position: 'absolute',
            zIndex: 999,
            left: 12,
            top: 12
          }}
        />
      )}

      {loading ? <BaseDialog transparent={true} visible={true} animation="fade" /> : null}
      <View
        style={{
          borderRadius: DDS.isTab ? 5 : 0,
          backgroundColor: colors.bg,
          zIndex: 10,
          width: '100%',
          minHeight: '100%'
        }}
      >
        <View
          style={{
            height: 250,
            overflow: 'hidden'
          }}
        >
          <SvgToPngView src={SVG(colors.night ? 'white' : 'black')} height={700} />
        </View>

        <View
          style={{
            width: '100%',
            justifyContent: 'center',
            alignSelf: 'center',
            paddingHorizontal: 12,
            marginBottom: 30,
            marginTop: 15
          }}
        >
          <Heading
            style={{
              textAlign: 'center'
            }}
            size={30}
            color={colors.heading}
          >
            Create an account
          </Heading>
          <Paragraph
            style={{
              textDecorationLine: 'underline',
              textAlign: 'center'
            }}
            onPress={() => {
              changeMode(0);
            }}
            size={SIZE.md}
          >
            Already have an account? Log in
          </Paragraph>
        </View>
        <View
          style={{
            width: '100%',
            padding: 12,
            backgroundColor: colors.bg,
            flexGrow: 1
          }}
        >
          <Input
            fwdRef={emailInputRef}
            onChangeText={value => {
              email.current = value;
            }}
            onErrorCheck={e => setError(e)}
            returnKeyLabel="Next"
            returnKeyType="next"
            autoCompleteType="email"
            validationType="email"
            autoCorrect={false}
            autoCapitalize="none"
            errorMessage="Email is invalid"
            placeholder="Email"
            onSubmit={() => {}}
          />

          <Input
            fwdRef={passwordInputRef}
            onChangeText={value => {
              password.current = value;
            }}
            onErrorCheck={e => setError(e)}
            returnKeyLabel="Next"
            returnKeyType="next"
            secureTextEntry
            autoCompleteType="password"
            autoCapitalize="none"
            validationType="password"
            autoCorrect={false}
            placeholder="Password"
          />

          <Input
            fwdRef={confirmPasswordInputRef}
            onChangeText={value => {
              confirmPassword.current = value;
            }}
            onErrorCheck={e => setError(e)}
            returnKeyLabel="Signup"
            returnKeyType="done"
            secureTextEntry
            autoCompleteType="password"
            autoCapitalize="none"
            autoCorrect={false}
            validationType="confirmPassword"
            customValidator={() => password.current}
            placeholder="Confirm password"
            marginBottom={5}
          />
          <Paragraph size={SIZE.xs} color={colors.icon}>
            By signing up, you agree to our terms of service and privacy policy.
          </Paragraph>

          <View
            style={{
              // position: 'absolute',
              marginTop: 50,
              alignSelf: 'center'
            }}
          >
            <Button
              style={{
                marginTop: 10,
                width: 250,
                borderRadius: 100
              }}
              loading={loading}
              onPress={signup}
              type="accent"
              title={loading ? null : 'Agree and continue'}
            />

            {loading || !welcome ? null : (
              <Button
                style={{
                  marginTop: 10,
                  width: 250,
                  borderRadius: 100
                }}
                type="grayBg"
                title="Skip for now"
              />
            )}
          </View>
        </View>
      </View>
    </>
  );
};
