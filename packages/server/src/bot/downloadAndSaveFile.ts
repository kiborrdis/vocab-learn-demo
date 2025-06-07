export const downloadFileToBase64 = async (url: URL) => {
  const resp = await fetch(url);

  const buf = await resp.arrayBuffer();

  return Buffer.from(buf).toString("base64");
};
