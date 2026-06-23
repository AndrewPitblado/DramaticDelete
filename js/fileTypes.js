(() => {
  const { FILE_TYPE_CONFIG, FILE_TYPE_EXTENSION_GROUPS } = window.DD_CONFIG;

  function getFileTypeConfig(fileType) {
    return FILE_TYPE_CONFIG[fileType] || FILE_TYPE_CONFIG.generic;
  }

  function getFileTypeFromName(fileName) {
    const extension = fileName.includes(".")
      ? fileName.split(".").pop()?.toLowerCase()
      : "";

    for (const [fileType, extensions] of Object.entries(
      FILE_TYPE_EXTENSION_GROUPS,
    )) {
      if (extensions.includes(extension)) {
        return fileType;
      }
    }

    return "generic";
  }

  window.DD_FILE_TYPES = Object.freeze({
    getFileTypeConfig,
    getFileTypeFromName,
  });
})();
