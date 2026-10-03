module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
        },
      ],
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
            "@domain": "./src/domain",
            "@application": "./src/application",
            "@adapters": "./src/adapters",
            "@infra": "./src/infra",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
