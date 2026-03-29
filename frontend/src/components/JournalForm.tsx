import { useState } from "react";
import { useDrag, useDrop } from "react-dnd";

import InstrumentsSidebar from "./InstrumentsSidebar";
import JournalCard from "./JournalCard";
import LessonsSidebar from "./LessonsSidebar";
import AIJournalChatbot from "./AIJournalChatbot";
import "./JournalForm.css";

function DraggableCard({ id, index, moveCard, children }: any) {
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
      <div className="drag-handle">☰ Drag to reorder</div>
      {children}
    </div>
  );
}

export default function JournalForm() {
  const [layout, setLayout] = useState([
    { id: "instruments", component: <InstrumentsSidebar /> },
    { id: "journal", component: <JournalCard /> },
    { id: "lessons", component: <LessonsSidebar /> },
    { id: "chatbot", component: <AIJournalChatbot /> },
  ]);

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
    </div>
  );
}
