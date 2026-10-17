import { useState } from "react";
import { Header, PageHeading, WorkbenchTabs, Footer } from "./components/Shell";
import { Studio } from "./components/Studio";
import { CycleStrip } from "./components/CycleStrip";
import { Insight } from "./components/PreviewDetails";
import { Library, Notes } from "./components/Library";
import { useWorkbench } from "./motion/useWorkbench";
export default function App() {
  const [tab, setTab] = useState("studio");
  const workbench = useWorkbench();
  return (
    <div className="app-shell">
      <Header setTab={setTab} />
      <main>
        <PageHeading
          exportSheet={workbench.exportSheet}
          canExport={workbench.canExport}
        />
        <WorkbenchTabs tab={tab} setTab={setTab} />
        {tab === "studio" && (
          <>
            <Studio {...workbench} />
            <CycleStrip {...workbench} />
            <Insight setTab={setTab} />
          </>
        )}
        {tab === "assets" && <Library />}
        {tab === "notes" && <Notes />}
        <Footer />
      </main>
    </div>
  );
}
