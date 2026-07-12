/**
 * Save handle a snapshot settings tab registers with the ChannelSettings sticky
 * footer, so the single "Update Settings" action can trigger the active tab's
 * save. Kept in its own module to avoid a page <-> form import cycle.
 */
export interface TabSaveHandle {
  save: () => Promise<void>;
  canSave: boolean;
}
