# Stage 5: Initial Zoom Out Review Report (`AIS-49_ViewGP_程式修改規格書.md`)

**Target Document**: [AIS-49_ViewGP_程式修改規格書.md](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/docs/ViewGP_Web/AIS-49_ViewGP_程式修改規格書.md) (`FeatureRange = 1..456`, `DetailedRange = N/A`)

---

## Finding 1: Reinventing the Wheel — Creating a Separate `src/services/communicationApi.ts` Module

* **Severity**: Major
* **Affected Scope**: `## Detailed Implementation Plan -> #### 16. src/services/projectApi.ts & src/services/communicationApi.ts (Modify)` (Lines 405–411)
* **Simplicity Rationale**:
  The specification proposes modifying (or creating) `src/services/communicationApi.ts` to add `testDeviceConnection(device: CommunicationDevice)`. However, `src/services/communicationApi.ts` does not exist in the codebase. The existing codebase already provides a dedicated HTTP client module [communication.ts](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/src/services/communication.ts#L19-L42) with a generic `communicationRequest<T>(path, body, timeoutMs)` wrapper that is already imported directly by [CommunicationDialog.tsx](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/src/components/dialogs/CommunicationDialog.tsx#L9) and [useCommunication.ts](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/src/hooks/useCommunication.ts#L4).
  Introducing a second communication API client file splits Modbus HTTP calls across two modules for a single one-line `communicationRequest("test", device)` call. Reuse `src/services/communication.ts` instead.

---

## Finding 2: Reinventing the Wheel & Architectural Mismatch — Hardcoding `HoldingRegister 0` in `POST /api/communication/test`

* **Severity**: Major
* **Affected Scope**: `## Technical Plan (Architecture) -> ### 5. 後端 C# API 與 SQLite 擴充規格` (Lines 206–207) & `## Detailed Implementation Plan -> #### 18.` (Line 428)
* **Simplicity Rationale**:
  1. **Phantom Type Name**: Line 428 references `CommunicationDeviceConfig`, whereas [CommunicationSettings.cs](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/server/CommunicationSettings.cs#L5) already defines the record `CommunicationDevice` and validator `CommunicationSettings.ValidDevice(CommunicationDevice d)`.
  2. **Over-Assuming Register Map & Misclassifying Modbus Exceptions**: The spec proposes probing connectivity by reading `HoldingRegister 0` (length 1) and treating exceptions as failures. In real industrial Modbus slaves (PLCs, VFD drives, meters), `HoldingRegister 0` often does not exist and returns a valid Modbus Exception PDU (Function `0x83`, Exception Code `0x02 Illegal Data Address`), which [ModbusCodec.ValidateFunction](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/server/ModbusCodec.cs#L38) throws as `ModbusProtocolException`. However, receiving a valid Modbus exception frame from the unit ID proves that the physical TCP/RTU transport and device Unit ID are online and responding! Furthermore, for TCP devices or mapped tags, probing either the first mapped tag of that device (if any) or treating a valid Modbus Exception response (`ModbusProtocolException` with exception code) from Function 03 as a successful device response avoids false-negative connection tests on devices without address 0, while reusing existing `ModbusTcpTransport` / `ModbusRtuTransport` and `CommunicationSettings.ValidDevice`.

---

## Finding 3: YAGNI / Redundant State — Adding `lastDataTimestamp` State in `useSimulation.ts`

* **Severity**: Nit
* **Affected Scope**: `## Detailed Implementation Plan -> #### 9. src/hooks/useSimulation.ts (Modify)` (Line 349) & `#### 14. src/components/editor/CanvasEditor.tsx` (Line 392)
* **Simplicity Rationale**:
  Line 349 proposes adding a new `lastDataTimestamp` state in [useSimulation.ts](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/src/hooks/useSimulation.ts) to display a data freshness timestamp in the status bar. However, the existing codebase already computes and updates `$SYS.TIME` / `$SYS.DATETIME` every 250ms in `values` via [systemVariables.ts](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/src/services/systemVariables.ts#L105-L107) during simulation, and in online mode [useCommunication.ts](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/src/hooks/useCommunication.ts#L17) already exposes `communicationSnapshot.devices[].lastSuccessAt` and `tags[].updatedAt`. Maintaining a separate React state for `lastDataTimestamp` in `useSimulation.ts` duplicates existing runtime timestamps and causes unnecessary re-renders. Derive the freshness timestamp directly from `communicationSnapshot` (in online mode) or `values["$SYS.TIME"]` (in simulation mode).

---

## Finding 4: Reinventing the Wheel — `duplicate()` Function vs Existing `copy()` + `paste()` in `useEditor.ts`

* **Severity**: Nit
* **Affected Scope**: `## Detailed Implementation Plan -> #### 12. src/hooks/useEditor.ts & src/hooks/useEditorShortcuts.ts` (Lines 374–375)
* **Simplicity Rationale**:
  Line 374 proposes adding a new `duplicate()` method in [useEditor.ts](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/src/hooks/useEditor.ts#L257-L293) for `Ctrl+D`. Examination of `useEditor.ts` shows that `paste()` (lines 270–293) already handles deep-cloning elements, remapping `groupId`s so grouped elements stay grouped in the new copy, resolving `imageAssetId` vs inline `image`, offsetting coordinates by `+20px` clamped to screen bounds, unlocking the copy, and selecting the newly created elements. Rather than writing a separate element-cloning implementation for `duplicate()`, `duplicate()` should simply share the core cloning helper with `paste()` (or clone selected elements through the exact same group/asset-safe transform without mutating `clipboard`).

---

## Finding 5: Memory & Performance Risk — Doubling `useHistory` Snapshots to 100 Full Project Clones

* **Severity**: Nit
* **Affected Scope**: `## Technical Plan (Architecture) -> ### 3.3` (Line 172) & `## Detailed Implementation Plan -> #### 12. src/hooks/useHistory.ts` (Line 373)
* **Simplicity Rationale**:
  [useHistory.ts](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/src/hooks/useHistory.ts#L8-L10) stores full deep clones of `Project` (`clone(snapshot)`), which includes `project.assets` (up to 100 Base64 images, each up to 4MB per [model.ts](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/src/model.ts#L548-L560)). Increasing the history buffer from 50 to 100 steps doubles the worst-case in-memory footprint without addressing reference sharing for immutable `ImageAsset` entries, and no user bottleneck was identified in `The Problem` for 50 undo steps (the actual problem stated in `The Problem` #3 is losing element selection on `undo`/`redo`). Either keep the 50-step limit or preserve `project.assets` array item references across snapshots if expanding to 100 steps.
