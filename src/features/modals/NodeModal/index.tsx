import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import useFile from "../../../store/useFile";
import useJson from "../../../store/useJson";
import { useModal } from "../../../store/useModal";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened }: ModalProps) => {
  const setContents = useFile(state => state.setContents);
  const nodeData = useGraph(state => state.selectedNode);
  const setVisible = useModal(state => state.setVisible);
  const getJson = useJson(state => state.getJson);
  const setJson = useJson(state => state.setJson);

  // Extract editable fields from nodeData
  const initialFields = React.useMemo(() => {
    const fields = {};
    nodeData?.text?.forEach(row => {
      // Only include primitive fields (string, number, boolean)
      if (
        row.key &&
        (typeof row.value === "string" ||
          typeof row.value === "number" ||
          typeof row.value === "boolean")
      ) {
        fields[row.key] = row.value;
      }
    });
    return fields;
  }, [nodeData]);

  const [fields, setFields] = React.useState(initialFields);
  React.useEffect(() => {
    setFields(initialFields);
  }, [initialFields, opened]);

  // Save handler: update node and JSON
  const handleSave = () => {
    if (!nodeData || !nodeData.path) return;
    try {
      const json = JSON.parse(getJson());
      // Update only the fields shown in modal
      function updateFieldsAtPath(obj, path, newFields) {
        if (!Array.isArray(path) || path.length === 0) return obj;
        let ref = obj;
        for (let i = 0; i < path.length - 1; i++) {
          const key = path[i];
          if (ref[key] === undefined) return obj;
          ref = ref[key];
        }
        // Only update keys present in newFields
        Object.keys(newFields).forEach(k => {
          ref[path[path.length - 1]][k] = newFields[k];
        });
        return obj;
      }
      updateFieldsAtPath(json, nodeData.path, fields);
      const updatedJsonStr = JSON.stringify(json, null, 2);
      setJson(updatedJsonStr);
      setContents({ contents: updatedJsonStr, hasChanges: true });
    } catch (e) {
      // no-op
    }
    setVisible("NodeModal", false);
  };

  // Cancel handler: discard changes
  const handleCancel = () => {
    setFields(initialFields);
    setVisible("NodeModal", false);
  };

  // Field change handler
  const handleFieldChange = (key, value) => {
    setFields(f => ({ ...f, [key]: value }));
  };

  // Removed unused setValueAtPath and handlEdit

  return (
    <Modal size="auto" opened={opened} onClose={handleCancel} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex align="center" gap="xs">
              <Button size="xs" color="green" variant="filled" onClick={handleSave}>
                Save
              </Button>
              <Button size="xs" color="red" variant="filled" onClick={handleCancel}>
                Cancel
              </Button>
              <CloseButton onClick={handleCancel} />
            </Flex>
          </Flex>
          <Stack gap="xs" p="xs">
            {Object.keys(fields).map(key => (
              <Flex key={key} align="center" gap="xs">
                <Text fz="sm" fw={500} style={{ minWidth: 80 }}>
                  {key}
                </Text>
                <input
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                  }}
                  value={fields[key] ?? ""}
                  onChange={e => handleFieldChange(key, e.target.value)}
                />
              </Flex>
            ))}
          </Stack>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
