/* Wrangler's [[rules]] Text loader imports .txt files as strings. */
declare module "*.txt" {
  const text: string;
  export default text;
}
