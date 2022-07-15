import { Text, Flex } from "rebass";
import Dialog from "./dialog";
import * as Icon from "../icons";
import { getHomeRoute, hardNavigate } from "../../navigation";
import { appVersion } from "../../utils/version";
import Config from "../../utils/config";
import { isTesting } from "../../utils/platform";
import { useEffect } from "react";

type CallToAction = {
  title: string;
  icon?: (props: any) => JSX.Element;
  action?: () => void;
};
type SubFeature = {
  title: string;
  icon?: (props: any) => JSX.Element;
  subtitle?: string | JSX.Element;
};
type Feature = {
  shouldShow?: () => boolean;
  title: string;
  subtitle?: string;
  cta: CallToAction;
  subFeatures?: SubFeature[];
};

export type FeatureKeys = "confirmed" | "highlights";
const features: Record<FeatureKeys, Feature> = {
  confirmed: {
    title: "Email confirmed!",
    subtitle: "You can now sync your notes to unlimited devices.",
    cta: {
      title: "Continue",
      icon: Icon.ArrowRight,
      action: () => hardNavigate(getHomeRoute()),
    },
  },
  highlights: {
    title: appVersion.isBeta
      ? "Welcome to Notesnook Beta!"
      : "✨ Highlights ✨",
    subtitle: appVersion.isBeta
      ? `v${appVersion.clean}-beta`
      : `Welcome to v${appVersion.clean}`,
    subFeatures: appVersion.isBeta
      ? [
          {
            icon: Icon.Warn,
            title: "Notice",
            subtitle: (
              <>
                This is the beta version and as such will contain bugs. Things
                are expected to break but should be generally stable. Please use
                the <Code text="Report an issue" /> button to report all bugs.
                Thank you!
              </>
            ),
          },
          {
            icon: Icon.Warn,
            title: "Notice 2",
            subtitle: (
              <>
                Switching between beta &amp; stable versions can cause weird
                issues including data loss. It is recommended that you do not
                use both simultaneously. You can switch once the beta version
                enters stable.
              </>
            ),
          },
        ]
      : [
          {
            title: "A brand new editor",
            subtitle:
              "We have switched to a completely new editor for Notesnook. Why? Because we wanted something that was extensible and future proof.",
          },
          {
            title: "Configurable toolbar",
            subtitle: (
              <>
                Everyone's deserves their own toolbar that fits their needs
                perfectly. Go to <Code text="Settings > Editor Settings" /> and
                build your very own toolbar.
              </>
            ),
          },
          {
            title: "Outline list",
            subtitle: (
              <>
                Click on the <Code text="+" /> button in the toolbar to try it
                out. It works just like Workflowy/Obsidian.
              </>
            ),
          },
          {
            title: "Task list",
            subtitle:
              "A new task list that keeps track of your progress and supports reordering items via drag & drop.",
          },
          {
            title: "Math support",
            subtitle:
              "Inline and multi-line Math & formula (Chemistry) support is here with KaTex.",
          },
          {
            title: "Selected word count",
            subtitle:
              "Word counter now shows total words under selection when you select some text.",
          },
        ],
    cta: {
      title: "Got it",
      icon: Icon.Checkmark,
      action: () => {
        Config.set(`${appVersion.numerical}:highlights`, true);
      },
    },
    shouldShow: () => {
      if (!features.highlights.subFeatures?.length) return false;

      const key = `${appVersion.numerical}:highlights`;
      const hasShownBefore = Config.get(key, false) as boolean;
      const hasShownAny =
        appVersion.isBeta || Config.has((k) => k.endsWith(":highlights"));
      if (!hasShownAny) Config.set(key, true);

      return hasShownAny && !isTesting() && !hasShownBefore;
    },
  },
};

type FeatureDialogProps = {
  featureName: FeatureKeys;
  onClose: (result: boolean) => void;
};

function FeatureDialog(props: FeatureDialogProps) {
  const { featureName, onClose } = props;
  const feature = features[featureName];

  useEffect(() => {
    if (!feature || (feature.shouldShow && !feature.shouldShow())) {
      onClose(false);
    }
  }, [feature, onClose]);

  return (
    <Dialog
      isOpen={true}
      title={feature.title}
      description={feature.subtitle}
      alignment="center"
      positiveButton={{
        text: (
          <Flex>
            {feature.cta.icon && (
              <feature.cta.icon color="primary" size={16} sx={{ mr: 1 }} />
            )}
            {feature.cta.title}
          </Flex>
        ),
        onClick: () => {
          if (feature.cta.action) feature.cta.action();
          props.onClose(true);
        },
      }}
    >
      <Flex flexDirection="column" overflowY="auto" mt={2}>
        {feature.subFeatures?.map((feature) => (
          <Flex
            mb={2}
            bg="bgSecondary"
            p={2}
            sx={{ borderRadius: "default", ":hover": { bg: "hover" } }}
            flexDirection="column"
          >
            <Flex alignItems={"center"} justifyContent="start">
              {feature.icon && <feature.icon size={14} color="primary" />}
              <Text variant="subtitle" fontWeight="normal" ml={1}>
                {feature.title}
              </Text>
            </Flex>
            {feature.subtitle && (
              <Text variant="body" color="icon">
                {feature.subtitle}
              </Text>
            )}
          </Flex>
        ))}
      </Flex>
    </Dialog>
  );
}
export default FeatureDialog;

type CodeProps = { text: string; href?: string };
export function Code(props: CodeProps) {
  return (
    <Text
      as="code"
      sx={{
        bg: "background",
        color: "text",
        px: 1,
        borderRadius: 5,
        fontFamily: "monospace",
        fontSize: "subBody",
        border: "1px solid var(--border)",
        cursor: props.href ? "pointer" : "unset",
      }}
      onClick={() => {
        if (props.href) window.open(props.href, "_target");
      }}
    >
      {props.text}
    </Text>
  );
}