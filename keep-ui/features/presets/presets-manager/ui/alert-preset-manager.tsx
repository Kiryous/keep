import React, { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { Table } from "@tanstack/react-table";
import { AlertsRulesBuilder } from "@/features/presets/presets-manager/ui/alerts-rules-builder";
import { CreateOrUpdatePresetForm } from "@/features/presets/create-or-update-preset";
import { STATIC_PRESETS_NAMES } from "@/entities/presets/model/constants";
import { Preset } from "@/entities/presets/model/types";
import { usePresets } from "@/entities/presets/model/usePresets";
import { CopilotKit } from "@copilotkit/react-core";
import { Button } from "@tremor/react";
import { PushAlertToServerModal } from "@/features/alerts/simulate-alert";
import { AlertErrorEventModal } from "@/features/alerts/alert-error-event-process";
import { GrTest } from "react-icons/gr";
import { useAlerts, type AlertDto } from "@/entities/alerts/model";
import { MdErrorOutline } from "react-icons/md";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface Props {
  presetName: string;
  // TODO: pass specific functions not the whole table?
  table?: Table<AlertDto>;
  onCelChanges?: (cel: string) => void;
  // Group expansion controls
  isGroupingActive?: boolean;
  onToggleAllGroups?: () => void;
  areAllGroupsExpanded?: () => boolean;
}

export function AlertPresetManager({
  presetName,
  table,
  onCelChanges,
  isGroupingActive = false,
  onToggleAllGroups,
  areAllGroupsExpanded,
}: Props) {
  const { dynamicPresets, mutate: mutatePresets } = usePresets({
    revalidateOnFocus: false,
  });

  const { useErrorAlerts } = useAlerts();
  const { data: errorAlerts } = useErrorAlerts();

  // TODO: make a hook for this? store in the context?
  const selectedPreset = useMemo(() => {
    return dynamicPresets?.find(
      (p) =>
        p.name.toLowerCase() === decodeURIComponent(presetName).toLowerCase()
    ) as Preset | undefined;
  }, [dynamicPresets, presetName]);
  const [presetCEL, setPresetCEL] = useState("");

  // preset modal
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  // add alert modal
  const [isAddAlertModalOpen, setIsAddAlertModalOpen] = useState(false);

  // error alert modal
  const [isErrorAlertModalOpen, setIsErrorAlertModalOpen] = useState(false);

  const router = useRouter();

  const onCreateOrUpdatePreset = async (preset: Preset) => {
    setIsPresetModalOpen(false);
    const encodedPresetName = encodeURIComponent(preset.name.toLowerCase());
    const newUrl = `/alerts/${encodedPresetName}`;
    
    // Check if we're updating an existing preset and the name has changed
    const oldPresetName = selectedPreset?.name?.toLowerCase();
    const newPresetName = preset.name.toLowerCase();
    const isNameChanged = selectedPreset && oldPresetName !== newPresetName;
    
    if (isNameChanged) {
      // For name changes, we need to ensure the preset data is fresh before navigating
      try {
        // Wait for the preset list to be revalidated
        await mutatePresets();
        
        // Use window.location to force a full page reload which ensures
        // the new preset is properly loaded
        window.location.href = newUrl;
      } catch (error) {
        console.error("Failed to revalidate presets after name change:", error);
        // Fallback to normal navigation
        router.push(newUrl);
      }
    } else {
      // For new presets or updates without name changes, use normal navigation
      router.push(newUrl);
    }
  };

  const handlePresetModalClose = () => {
    setIsPresetModalOpen(false);
  };

  const handleAddAlertModalOpen = () => {
    setIsAddAlertModalOpen(true);
  };

  const handleAddAlertModalClose = () => {
    setIsAddAlertModalOpen(false);
  };

  const handleErrorAlertModalClose = () => {
    setIsErrorAlertModalOpen(false);
  };

  const isDynamic =
    selectedPreset && !STATIC_PRESETS_NAMES.includes(selectedPreset.name);

  // Static presets are not editable
  const idToUpdate = isDynamic ? selectedPreset.id : null;

  const presetData = isDynamic
    ? {
        CEL: presetCEL,
        name: selectedPreset.name,
        isPrivate: selectedPreset.is_private,
        isNoisy: selectedPreset.is_noisy,
        tags: selectedPreset.tags,
        groupColumn: selectedPreset.group_column,
        counterShowsFiringOnly: selectedPreset.counter_shows_firing_only,
      }
    : {
        CEL: presetCEL,
        name: undefined,
        isPrivate: undefined,
        isNoisy: undefined,
        tags: undefined,
        groupColumn: undefined,
        counterShowsFiringOnly: true,
      };

  // for future use
  const getGroupableColumns = () => {
    if (!table) return [];

    return table
      .getAllColumns()
      .filter((column) => column.getCanGroup())
      .map((column) => ({
        id: column.id,
        header: column.columnDef.header?.toString() || column.id,
      }));
  };

  return (
    <>
      <div className="flex w-full items-start relative z-10 justify-between">
        <AlertsRulesBuilder
          table={table}
          defaultQuery=""
          selectedPreset={selectedPreset}
          setIsModalOpen={setIsPresetModalOpen}
          setPresetCEL={setPresetCEL}
          onCelChanges={onCelChanges}
        />

        <Button
          variant="secondary"
          tooltip="Test alerts"
          size="sm"
          icon={GrTest}
          onClick={handleAddAlertModalOpen}
          className="ml-2"
          color="orange"
        ></Button>

        {/* Group expansion toggle button */}
        {isGroupingActive && onToggleAllGroups && areAllGroupsExpanded && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onToggleAllGroups}
            icon={areAllGroupsExpanded() ? ChevronUpIcon : ChevronDownIcon}
            tooltip={
              areAllGroupsExpanded()
                ? "Collapse all groups"
                : "Expand all groups"
            }
            className="ml-2"
            color="orange"
          >
            {areAllGroupsExpanded() ? "Collapse All" : "Expand All"}
          </Button>
        )}
        {/* Error alerts button with notification counter */}
        {errorAlerts && errorAlerts.length > 0 && (
          <div className="relative inline-flex ml-2">
            <Button
              color="rose"
              variant="secondary"
              size="sm"
              onClick={() => setIsErrorAlertModalOpen(true)}
              icon={MdErrorOutline}
            />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {errorAlerts.length}
            </span>
          </div>
        )}
      </div>

      {/* Preset Modal */}
      <Modal
        isOpen={isPresetModalOpen}
        onClose={handlePresetModalClose}
        className="w-[40%] max-w-screen-2xl max-h-[710px] transform overflow-auto ring-tremor bg-white p-6 text-left align-middle shadow-tremor transition-all rounded-xl"
      >
        <CopilotKit runtimeUrl="/api/copilotkit">
          <CreateOrUpdatePresetForm
            key={idToUpdate}
            presetId={idToUpdate}
            presetData={presetData}
            // in the future, we might want to allow grouping by any column
            // for now, let's use group only if the user chose a group by column
            //groupableColumns={getGroupableColumns()}
            groupableColumns={[]}
            onCreateOrUpdate={onCreateOrUpdatePreset}
            onCancel={handlePresetModalClose}
          />
        </CopilotKit>
      </Modal>

      {/* Add Alert Modal */}
      <PushAlertToServerModal
        isOpen={isAddAlertModalOpen}
        handleClose={handleAddAlertModalClose}
        presetName={presetName}
      />

      {/* Error Alert Modal */}
      <AlertErrorEventModal
        isOpen={isErrorAlertModalOpen}
        onClose={handleErrorAlertModalClose}
      />
    </>
  );
}
