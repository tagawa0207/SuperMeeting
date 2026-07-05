import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 拡張（extension/）はビルド無しの素の JS のため対象外。
  globalIgnores([".next/**", "node_modules/**", "extension/**"]),
  {
    rules: {
      // 既存コードの意図的なパターン（SSR 対策の effect 内 setState /
      // コールバック用 ref の render 時更新）を許容する。新規コードでは避ける。
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
