import { CHECK_IDS } from "@streetwriters/notesnook-core/common";
import React from "react";
import { Platform } from "react-native";
import * as RNIap from "react-native-iap";
import DialogHeader from "../components/dialog/dialog-header";
import { CompactFeatures } from "../components/premium/compact-features";
import { PricingPlans } from "../components/premium/pricing-plans";
import Seperator from "../components/ui/seperator";
import { useUserStore } from "../stores/use-user-store";
import { itemSkus, SUBSCRIPTION_STATUS } from "../utils/constants";
import { db } from "../common/database";
import {
  eOpenPremiumDialog,
  eOpenTrialEndingDialog,
  eShowGetPremium
} from "../utils/events";
import { MMKV } from "../common/database/mmkv";
import { eSendEvent, presentSheet, ToastEvent } from "./event-manager";
import SettingsService from "./settings";

let premiumStatus = 0;
let products = [];
let user = null;

function getUser() {
  return user;
}

async function setPremiumStatus() {
  let userstore = useUserStore.getState();
  try {
    user = await db.user.getUser();
    if (!user) {
      premiumStatus = 0;
      userstore.setPremium(get());
    } else {
      premiumStatus = user.subscription?.type || 0;
      userstore.setPremium(get());
      userstore.setUser(user);
    }
  } catch (e) {
    premiumStatus = 0;
  } finally {
    if (get()) {
      await subscriptions.clear();
    }
    try {
      await RNIap.initConnection();
      products = await RNIap.getSubscriptions(itemSkus);
    } catch (e) {
      console.log("subscriptions: ", e);
    }
  }
}

function getMontlySub() {
  let _product = products.find(
    (p) => p.productId === "com.streetwriters.notesnook.sub.mo"
  );
  if (!_product) {
    _product = {
      localizedPrice: "$4.49"
    };
  }
  console.log(_product.localizedPrice);
  return _product;
}

async function getProducts() {
  if (!products || products.length === 0) {
    products = await RNIap.getSubscriptions(itemSkus);
  }
  return products;
}

function get() {
  if (__DEV__) return true;

  return SUBSCRIPTION_STATUS.BASIC !== premiumStatus;
}

async function verify(callback, error) {
  try {
    if (!get()) {
      if (error) {
        error();
        return;
      }
      eSendEvent(eOpenPremiumDialog);
      return;
    }
    if (!callback) console.warn("You must provide a callback function");
    await callback();
  } catch (e) {}
}

const onUserStatusCheck = async (type) => {
  let user = await db.user.getUser();
  let userstore = useUserStore.getState();
  premiumStatus = user?.subscription?.type || 0;
  if (userstore?.premium !== get()) {
    userstore.setPremium(get());
  }
  console.log("status check: ", type, get());

  let status = get();
  let message = null;
  if (!status) {
    switch (type) {
      case CHECK_IDS.noteColor:
        message = {
          context: "sheet",
          title: "Get Notesnook Pro",
          desc: "To assign colors to a note get Notesnook Pro today."
        };
        break;
      case CHECK_IDS.noteExport:
        message = {
          context: "export",
          title: "Export in PDF, MD & HTML",
          desc: "Get Notesnook Pro to export your notes in PDF, Markdown and HTML formats!"
        };
        break;
      case CHECK_IDS.noteTag:
        message = {
          context: "sheet",
          title: "Get Notesnook Pro",
          desc: "To create more tags for your notes become a Pro user today."
        };
        break;
      case CHECK_IDS.notebookAdd:
        eSendEvent(eOpenPremiumDialog);
        break;
      case CHECK_IDS.vaultAdd:
        message = {
          context: "sheet",
          title: "Add Notes to Vault",
          desc: "With Notesnook Pro you can add notes to your vault and do so much more! Get it now."
        };
        break;
      case CHECK_IDS.databaseSync:
        message = null;
        break;
    }

    if (message) {
      eSendEvent(eShowGetPremium, message);
    }
  }
  return { type, result: status };
};

const showVerifyEmailDialog = () => {
  presentSheet({
    title: "Confirm your email",
    icon: "email",
    paragraph:
      "We have sent you an email confirmation link. Please check your email inbox. If you cannot find the email, check your spam folder.",
    action: async () => {
      try {
        let lastVerificationEmailTime =
          SettingsService.get().lastVerificationEmailTime;
        if (
          lastVerificationEmailTime &&
          Date.now() - lastVerificationEmailTime < 60000 * 2
        ) {
          ToastEvent.show({
            heading: "Please wait before requesting another email",
            type: "error",
            context: "local"
          });
          console.log("error");
          return;
        }
        await db.user.sendVerificationEmail();
        SettingsService.set({
          lastVerificationEmailTime: Date.now()
        });

        ToastEvent.show({
          heading: "Verification email sent!",
          message:
            "We have sent you an email confirmation link. Please check your email inbox to verify your account. If you cannot find the email, check your spam folder.",
          type: "success",
          context: "local"
        });
      } catch (e) {
        ToastEvent.show({
          heading: "Could not send email",
          message: e.message,
          type: "error",
          context: "local"
        });
      }
    },
    actionText: "Resend Confirmation Link"
  });
};

const subscriptions = {
  get: async () => {
    if (Platform.OS === "android") return;
    let _subscriptions = MMKV.getString("subscriptionsIOS");
    if (!_subscriptions) return [];
    return JSON.parse(_subscriptions);
  },
  set: async (subscription) => {
    if (Platform.OS === "android") return;
    let _subscriptions = MMKV.getString("subscriptionsIOS");
    if (_subscriptions) {
      _subscriptions = JSON.parse(_subscriptions);
    } else {
      _subscriptions = [];
    }
    let index = _subscriptions.findIndex(
      (s) => s.transactionId === subscription.transactionId
    );
    if (index === -1) {
      _subscriptions.unshift(subscription);
    } else {
      _subscriptions[index] = subscription;
    }
    MMKV.setString("subscriptionsIOS", JSON.stringify(_subscriptions));
  },
  remove: async (transactionId) => {
    if (Platform.OS === "android") return;
    let _subscriptions = MMKV.getString("subscriptionsIOS");
    if (_subscriptions) {
      _subscriptions = JSON.parse(_subscriptions);
    } else {
      _subscriptions = [];
    }
    let index = _subscriptions.findIndex(
      (s) => s.transactionId === transactionId
    );
    if (index !== -1) {
      _subscriptions.splice(index);
      MMKV.setString("subscriptionsIOS", JSON.stringify(_subscriptions));
    }
  },
  verify: async (subscription) => {
    if (Platform.OS === "android") return;
    console.log(
      "verifying: ",
      new Date(subscription.transactionDate).toLocaleString()
    );

    if (subscription.transactionReceipt) {
      if (Platform.OS === "ios") {
        let user = await db.user.getUser();
        if (!user) return;
        let requestData = {
          method: "POST",
          body: JSON.stringify({
            receipt_data: subscription.transactionReceipt,
            user_id: user.id
          }),
          headers: {
            "Content-Type": "application/json"
          }
        };
        try {
          let result = await fetch(
            "https://payments.streetwriters.co/apple/verify",
            requestData
          );

          let text = await result.text();
          console.log(text);
          if (!result.ok) {
            if (text === "Receipt already expired.") {
              await subscriptions.clear(subscription);
              console.log("clearing because expired");
            }
            return;
          }
        } catch (e) {
          console.log("subscription error", e);
        }
      }
    }
  },
  clear: async (_subscription) => {
    if (Platform.OS === "android") return;
    let _subscriptions = await subscriptions.get();
    let subscription = null;
    if (_subscription) {
      subscription = _subscription;
      console.log("got id to clear");
    } else {
      subscription = _subscriptions.length > 0 ? _subscriptions[0] : null;
    }
    if (subscription) {
      await RNIap.finishTransactionIOS(subscription.transactionId);
      await RNIap.clearTransactionIOS();
      await subscriptions.remove(subscription.transactionId);
      console.log("clearing subscriptions");
    }
  }
};

async function getRemainingTrialDaysStatus() {
  let user = await db.user.getUser();
  if (!user) return false;
  let premium = user.subscription.type !== SUBSCRIPTION_STATUS.BASIC;
  let isTrial = user.subscription.type === SUBSCRIPTION_STATUS.TRIAL;
  let total = user.subscription.expiry - user.subscription.start;
  let current = Date.now() - user.subscription.start;
  current = (current / total) * 100;
  console.log(current);
  let lastTrialDialogShownAt = MMKV.getString("lastTrialDialogShownAt");

  if (current > 75 && isTrial && lastTrialDialogShownAt !== "ending") {
    eSendEvent(eOpenTrialEndingDialog, {
      title: "Your trial is ending soon",
      offer: null,
      extend: false
    });
    MMKV.setItem("lastTrialDialogShownAt", "ending");
    return true;
  }

  if (!premium && lastTrialDialogShownAt !== "expired") {
    eSendEvent(eOpenTrialEndingDialog, {
      title: "Your trial has expired",
      offer: 30,
      extend: false
    });
    MMKV.setItem("lastTrialDialogShownAt", "expired");
    return true;
  }
  return false;
}

const features_list = [
  {
    content: "Unlock unlimited notebooks, tags, colors. Organize like a pro"
  },
  {
    content: "Attach files upto 500MB, upload 4K images with unlimited storage"
  },
  {
    content: "Instantly sync to unlimited devices"
  },
  {
    content: "A private vault to keep everything imporant always locked"
  },
  {
    content:
      "Rich note editing experience with markdown, tables, checklists and more"
  },
  {
    content: "Export your notes in Pdf, markdown and html formats"
  }
];

const sheet = (context, promo, trial) => {
  presentSheet({
    context: context,
    component: (ref) => (
      <>
        <DialogHeader
          centered
          title="Upgrade to Notesnook"
          titlePart="Pro"
          paragraph="Manage your work on another level, enjoy seemless sync and keep all notes in one place."
          padding={12}
        />
        <Seperator />
        <CompactFeatures
          scrollRef={ref}
          maxHeight={300}
          features={features_list}
          vertical
        />
        <Seperator half />
        <PricingPlans trial={trial} compact heading={false} promo={promo} />
      </>
    )
  });
};

const PremiumService = {
  verify,
  setPremiumStatus,
  get,
  onUserStatusCheck,
  showVerifyEmailDialog,
  getProducts,
  getUser,
  subscriptions,
  getMontlySub,
  getRemainingTrialDaysStatus,
  sheet
};

export default PremiumService;
