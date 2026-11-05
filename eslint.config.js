import neostandard from "neostandard";

export default [
    ...neostandard({
        semi: true,
        env: ["browser"],
        globals: ["chrome"],
    }),
    {
        rules: {
            "@stylistic/indent": ["error", 4],
            "@stylistic/space-before-function-paren": ["error", { anonymous: "always", named: "never", asyncArrow: "always" }],
            "@stylistic/comma-dangle": ["error", "only-multiline"],
            "@stylistic/object-property-newline": "off",
            "@stylistic/padded-blocks": "off",
            "@stylistic/quotes": "off",
            curly: "off",
            "one-var": "off",
            "prefer-const": "off",
        },
    },
];
