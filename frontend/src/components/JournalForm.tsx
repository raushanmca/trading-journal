import { useEffect, useState } from "react";
import { useDrag, useDrop } from "react-dnd";

import InstrumentsSidebar from "./InstrumentsSidebar";
import JournalCard from "./JournalCard";
import LessonsSidebar from "./LessonsSidebar";
import AIJournalChatbot from "./AIJournalChatbot";
import { getUserStorageKey } from "../utils/auth";
import "./JournalForm.css";
import { useLocalization } from "../localization/LocalizationProvider";

const DEFAULT_LAYOUT_IDS = ["instruments", "journal", "lessons"];

function buildLayout() {
  return [
    { id: "instruments", component: <InstrumentsSidebar /> },
    { id: "journal", component: <JournalCard /> },
    { id: "lessons", component: <LessonsSidebar /> },
  ];
}

function getLayoutFromIds(layoutIds: string[]) {
  const layoutMap = new Map(buildLayout().map((item) => [item.id, item]));

  return layoutIds
    .map((id) => layoutMap.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function DraggableCard({ id, index, moveCard, children }: any) {
  const { t } = useLocalization();
  const [, drag] = useDrag({
    type: "CARD",
    item: { index },
  });

  const [, drop] = useDrop({
    accept: "CARD",
    hover: (item: any) => {
      if (item.index === index) return;
      moveCard(item.index, index);
      item.index = index;
    },
  });

  return (
    <div ref={(node) => drag(drop(node))} className="draggable-card">
      <div className="drag-handle">☰ {t("journal.dragHandle")}</div>
      {children}
    </div>
  );
}

export default function JournalForm() {
  const [layout, setLayout] = useState(() => buildLayout());

  useEffect(() => {
    const storageKey = getUserStorageKey("journal-layout");

    if (!storageKey) {
      setLayout(buildLayout());
      return;
    }

    const savedLayout = localStorage.getItem(storageKey);

    if (!savedLayout) {
      setLayout(buildLayout());
      return;
    }

    try {
      const parsedIds = JSON.parse(savedLayout);

      if (
        !Array.isArray(parsedIds) ||
        parsedIds.length !== DEFAULT_LAYOUT_IDS.length ||
        DEFAULT_LAYOUT_IDS.some((id) => !parsedIds.includes(id))
      ) {
        setLayout(buildLayout());
        return;
      }

      setLayout(getLayoutFromIds(parsedIds));
    } catch (error) {
      console.error("Failed to parse saved layout", error);
      setLayout(buildLayout());
    }
  }, []);

  useEffect(() => {
    const storageKey = getUserStorageKey("journal-layout");

    if (!storageKey) {
      return;
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify(layout.map((item) => item.id)),
    );
  }, [layout]);

  const moveCard = (from: number, to: number) => {
    const updated = [...layout];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setLayout(updated);
  };

  return (
    <div className="page-container">
      <div className="journal-form-container">
        {layout.map((item, index) => (
          <DraggableCard key={item.id} index={index} moveCard={moveCard}>
            {item.component}
          </DraggableCard>
        ))}
      </div>
      <AIJournalChatbot />
    </div>
  );
}
