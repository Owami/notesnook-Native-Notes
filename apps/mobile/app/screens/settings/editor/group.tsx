import * as React from "react";
import { View } from "react-native";
import { DraxDragWithReceiverEventData, DraxView } from "react-native-drax";
import Animated, { Layout } from "react-native-reanimated";
import { presentDialog } from "../../../components/dialog/functions";
import { IconButton } from "../../../components/ui/icon-button";
import Paragraph from "../../../components/ui/typography/paragraph";
import { useThemeStore } from "../../../stores/use-theme-store";
import { getElevation } from "../../../utils";
import { SIZE } from "../../../utils/size";
import { renderTool } from "./common";
import { DraggableItem, useDragState } from "./state";
import ToolSheet from "./tool-sheet";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
export const Group = ({
  item,
  index: groupIndex,
  parentIndex
}: DraggableItem) => {
  const setData = useDragState((state) => state.setData);
  const [dragged, setDragged] = useDragState((state) => [
    state.dragged,
    state.setDragged
  ]);
  const [recieving, setRecieving] = React.useState(false);
  const [recievePosition, setRecievePosition] = React.useState("above");
  const isDragged =
    dragged &&
    Array.isArray(dragged?.item) &&
    dragged?.item[0] === item[0] &&
    parentIndex === undefined;

  const isSubgroup = parentIndex !== undefined;
  const dimensions = React.useRef({
    height: 0,
    width: 0
  });
  const colors = useThemeStore((state) => state.colors);

  if (isDragged) {
    console.log(dimensions.current.height, dimensions.current.width);
  }

  const onDrop = (data: DraxDragWithReceiverEventData) => {
    const isDroppedAbove = data.receiver.receiveOffsetRatio.y < 0.5;
    const dragged = data.dragged.payload;
    const reciever = data.receiver.payload;
    let _data = useDragState.getState().data.slice();

    if (dragged.type === "group") {
      const fromIndex = dragged.index;
      const toIndex = isDroppedAbove
        ? Math.max(0, reciever.index)
        : reciever.index + 1;

      _data.splice(
        toIndex > fromIndex ? toIndex - 1 : toIndex,
        0,
        _data.splice(fromIndex, 1)[0]
      );
    }

    // Always insert sub group at the end of the group.
    if (dragged.type === "subgroup") {
      const fromIndex = dragged.index;
      const toIndex = isDroppedAbove
        ? Math.max(0, reciever.index)
        : reciever.index + 1;

      const insertAt = _data[reciever.index] as string[];
      const insertFrom = _data[dragged.groupIndex] as string[];

      if (typeof insertAt[insertAt.length - 1] !== "string") {
        setRecieving(false);
        return data.dragAbsolutePosition;
      }
      insertAt.push(insertFrom.splice(fromIndex, 1)[0]);
    }

    if (dragged.type === "tool") {
      const insertFrom =
        typeof dragged.parentIndex === "number"
          ? (_data[dragged.parentIndex][dragged.groupIndex] as string[])
          : (_data[dragged.groupIndex] as string[]);
      //@ts-ignore
      _data[groupIndex].push(insertFrom.splice(dragged.index, 1)[0]);
    }

    setData(_data);
    setRecieving(false);
    return data.dragAbsolutePosition;
  };

  const onRecieveData = (data: DraxDragWithReceiverEventData) => {
    setRecieving(true);
    if (data.dragged.payload.type !== "group")
      return setRecievePosition("below");
    if (data.receiver.receiveOffsetRatio.y < 0.5) {
      setRecievePosition("above");
    } else {
      setRecievePosition("below");
    }
  };

  const buttons = [
    {
      name: "minus",
      onPress: () => {
        presentDialog({
          context: "global",
          title: "Delete group?",
          positiveText: "Delete",
          paragraph: "All tools in the collapsed section will also be removed.",
          positivePress: () => {
            if (groupIndex === undefined) return;
            const _data = useDragState.getState().data.slice();
            console.log(groupIndex);
            _data.splice(groupIndex, 1);
            console.log(_data);
            setData(_data);
          }
        });
      }
    },
    {
      name: "plus",
      onPress: () => {
        ToolSheet.present({
          item,
          index: groupIndex
        });
      }
    }
  ];

  const renderGroup = (hover: boolean) => {
    const isSubgroup = parentIndex !== undefined;

    return (
      <View
        onLayout={(event) => {
          if (hover) return;
          if (!isDragged) dimensions.current = event.nativeEvent.layout;
        }}
        style={[
          {
            width: isDragged ? dimensions.current?.width : "100%",
            backgroundColor: colors.bg,
            borderRadius: 10,
            ...getElevation(hover ? 5 : 0),
            marginTop: isSubgroup ? 0 : 10
          }
        ]}
      >
        {isSubgroup ? null : (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              height: 40,
              marginBottom: 5
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center"
              }}
            >
              <Icon size={SIZE.md} name="drag" color={colors.icon} />
              <Paragraph
                style={{
                  marginLeft: 5
                }}
                color={colors.icon}
                size={SIZE.xs}
              >
                GROUP
              </Paragraph>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center"
              }}
            >
              {buttons.map((item) => (
                <IconButton
                  top={0}
                  left={0}
                  bottom={0}
                  right={0}
                  key={item.name}
                  style={{
                    marginLeft: 10
                  }}
                  onPress={item.onPress}
                  name={item.name}
                  color={colors.icon}
                  size={SIZE.lg}
                />
              ))}
            </View>
          </View>
        )}

        {isDragged && hover
          ? null
          : renderTool({
              item,
              index: groupIndex,
              groupIndex,
              parentIndex: parentIndex
            })}
      </View>
    );
  };

  return (
    <Animated.View layout={Layout}>
      <DraxView
        longPressDelay={500}
        receptive={
          (dragged.type === "subgroup" && dragged.groupIndex === groupIndex) ||
          (dragged.type === "tool" && item.length > 0) ||
          (dragged.type === "group" && isSubgroup) ||
          (dragged.type === "subgroup" && isSubgroup) ||
          (dragged.type === "subgroup" &&
            dragged.item &&
            dragged.item[0] === item[0])
            ? false
            : true
        }
        payload={{
          item,
          index: groupIndex,
          parentIndex,
          type: "group"
        }}
        onDragStart={() => {
          setDragged({
            item,
            type: "group",
            ...dimensions.current
          });
        }}
        onDragDrop={(data) => {
          setDragged({});
        }}
        onDragEnd={(data) => {
          setDragged({});
        }}
        hoverDragReleasedStyle={{
          opacity: 0
        }}
        receivingStyle={{
          paddingBottom: recievePosition === "below" ? 50 : 0,
          paddingTop: recievePosition === "above" ? 50 : 0,
          backgroundColor: dragged.type === "subgroup" ? colors.nav : undefined,
          marginTop: recievePosition === "above" ? 10 : 0,
          marginBottom: recievePosition === "below" ? 10 : 0,
          borderRadius: 10
        }}
        renderHoverContent={({ dimensions: { width } }) => renderGroup(true)}
        onReceiveDragDrop={onDrop}
        onReceiveDragOver={onRecieveData}
        onReceiveDragExit={() => {
          setRecieving(false);
        }}
        onReceiveDragEnter={onRecieveData}
      >
        {!isDragged ? renderGroup(false) : <View />}
      </DraxView>
    </Animated.View>
  );
};
