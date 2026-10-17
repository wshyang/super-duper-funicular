import "./app/styles.css";
import { createRunLab } from "./app/views/run-lab.ts";

const host = document.querySelector<HTMLDivElement>("#app");
if (host === null) throw new Error("Missing #app mount point");

const lab = createRunLab();
host.append(lab.element);
lab.start();
