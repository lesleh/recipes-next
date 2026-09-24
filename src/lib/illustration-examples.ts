import type { Illustration } from "./illustration";

/**
 * Drawings made by hand. The three recipe examples go to the model with every
 * request and set the style it matches. The home drawing is the one the list
 * page shows, since no single recipe owns that page.
 */

export const EXAMPLE_ILLUSTRATIONS: Array<{ dish: string; illustration: Illustration }> = [
  {
    dish: "Tomato and basil spaghetti",
    illustration: {
      ground: "blue",
      pieces: [
        {
          kind: "stroke",
          d: "M20 260 C60 300 140 290 150 240 C160 190 90 190 100 230 C110 270 220 280 250 230 C280 180 230 140 200 170 C170 200 250 250 300 220",
          colour: "lemon-dark",
          width: 9,
        },
        {
          kind: "shape",
          d: "M70 160 C68 108 112 76 160 78 C212 80 248 116 246 166 C244 220 206 250 158 250 C110 250 72 214 70 160 Z",
          colour: "tomato",
        },
        {
          kind: "shape",
          d: "M98 146 C104 118 124 100 148 96 C130 112 118 132 114 156 Z",
          colour: "tomato-light",
        },
        {
          kind: "shape",
          d: "M160 84 C150 64 128 58 112 64 C130 70 140 78 150 86 C135 86 118 94 108 108 C128 102 145 98 158 92 C160 106 168 118 180 122 C174 108 170 98 168 90 C184 94 200 94 214 86 C198 80 182 80 168 84 C172 70 180 60 192 54 C176 54 164 66 160 84 Z",
          colour: "leaf",
        },
        { kind: "stroke", d: "M162 60 C160 48 164 38 172 32", colour: "leaf-dark", width: 6 },
        {
          kind: "shape",
          d: "M196 256 C222 214 272 204 298 220 C282 256 236 276 196 256 Z",
          colour: "leaf",
        },
        { kind: "stroke", d: "M204 252 C236 238 262 228 288 222", colour: "cut", width: 2.5 },
        {
          kind: "shape",
          d: "M150 262 C160 232 196 218 214 226 C206 254 178 270 150 262 Z",
          colour: "leaf-light",
        },
        { kind: "stroke", d: "M156 258 C176 246 192 236 208 228", colour: "cut", width: 2 },
        {
          kind: "shape",
          d: "M251 70 C251 66.1 254.1 63 258 63 C262.5 63 266 66.1 266 70 C266 73.4 262.5 76 258 76 C254.1 76 251 73.4 251 70 Z",
          colour: "ultramarine",
        },
        {
          kind: "shape",
          d: "M41 90 C41 87.2 43.2 85 46 85 C49.4 85 52 87.2 52 90 C52 92.8 49.4 95 46 95 C43.2 95 41 92.8 41 90 Z",
          colour: "lemon-dark",
        },
      ],
    },
  },
  {
    dish: "Lemon drizzle cake",
    illustration: {
      ground: "pink",
      pieces: [
        {
          kind: "shape",
          d: "M190 40 C230 30 282 52 290 96 C298 138 262 160 226 156 C188 152 168 124 170 92 C171 68 176 46 190 40 Z",
          colour: "lemon-dark",
        },
        {
          kind: "shape",
          d: "M286 70 C296 64 302 66 304 74 C298 76 292 76 286 70 Z",
          colour: "lemon-dark",
        },
        { kind: "stroke", d: "M200 60 C214 50 234 48 250 54", colour: "lemon-light", width: 4 },
        {
          kind: "shape",
          d: "M160 46 C176 14 222 4 246 18 C226 44 186 58 160 46 Z",
          colour: "leaf",
        },
        { kind: "stroke", d: "M166 44 C190 34 214 24 240 20", colour: "cut", width: 2.5 },
        {
          kind: "shape",
          d: "M28 196 C26 136 72 94 132 94 C194 94 238 138 236 198 C234 258 188 298 130 298 C72 298 30 256 28 196 Z",
          colour: "lemon",
        },
        {
          kind: "shape",
          d: "M46 196 C46 148.4 83.8 111 132 111 C180.7 111 219 148.4 219 196 C219 243 180.7 280 132 280 C83.8 280 46 243 46 196 Z",
          colour: "pith",
        },
        {
          kind: "shape",
          d: "M132 196 L132 120 C152 120 172 128 184 142 Z M132 196 L190 150 C202 164 208 182 208 198 Z M132 196 L208 206 C206 226 198 242 186 254 Z M132 196 L178 262 C164 270 150 274 136 274 Z M132 196 L126 274 C108 272 94 266 82 256 Z M132 196 L76 250 C64 236 58 220 56 204 Z M132 196 L56 194 C58 174 64 158 76 146 Z M132 196 L82 140 C94 130 108 122 124 120 Z",
          colour: "lemon-light",
        },
        {
          kind: "shape",
          d: "M123 196 C123 191.5 127 188 132 188 C135.9 188 139 191.5 139 196 C139 200.5 135.9 204 132 204 C127 204 123 200.5 123 196 Z",
          colour: "pith",
        },
        {
          kind: "shape",
          d: "M250 210 C256 222 262 232 256 240 C250 246 242 240 244 230 C246 222 248 216 250 210 Z",
          colour: "lemon",
        },
        {
          kind: "shape",
          d: "M272 250 C276 258 280 266 276 272 C272 276 266 272 268 264 C269 258 270 254 272 250 Z",
          colour: "lemon",
        },
        {
          kind: "shape",
          d: "M240 286 C258 278 280 280 292 294 C274 292 256 292 240 286 Z",
          colour: "pink",
        },
      ],
    },
  },
  {
    dish: "Aubergine parmigiana",
    illustration: {
      ground: "green",
      pieces: [
        {
          kind: "shape",
          d: "M70 250 C40 220 50 160 100 120 C140 88 180 70 206 84 C230 98 226 132 196 168 C160 212 110 280 70 250 Z",
          colour: "plum",
        },
        {
          kind: "shape",
          d: "M78 228 C68 200 80 168 110 140 C98 170 90 196 92 226 Z",
          colour: "plum-light",
        },
        {
          kind: "shape",
          d: "M196 72 C210 58 232 60 240 74 C226 74 218 80 214 90 C230 88 244 96 248 110 C232 104 218 102 206 106 C212 94 212 84 206 78 C200 86 190 90 180 90 C186 82 190 76 196 72 Z",
          colour: "lime",
        },
        { kind: "stroke", d: "M232 66 C240 50 252 40 266 36", colour: "lime", width: 7 },
        {
          kind: "shape",
          d: "M200 262 C220 222 264 212 290 226 C276 260 236 280 200 262 Z",
          colour: "leaf",
        },
        { kind: "stroke", d: "M208 258 C236 244 262 234 282 228", colour: "cut", width: 2.5 },
        {
          kind: "shape",
          d: "M30 60 C60 58 100 44 116 18 C120 10 112 6 108 14 C94 38 62 50 28 52 C20 53 22 61 30 60 Z",
          colour: "tomato",
        },
        {
          kind: "shape",
          d: "M268 150 C268 145.5 271.5 142 276 142 C279.9 142 283 145.5 283 150 C283 155 279.9 159 276 159 C271.5 159 268 155 268 150 Z",
          colour: "lemon",
        },
        {
          kind: "shape",
          d: "M35 130 C35 127.2 37.2 125 40 125 C42.8 125 45 127.2 45 130 C45 133.4 42.8 136 40 136 C37.2 136 35 133.4 35 130 Z",
          colour: "pink",
        },
      ],
    },
  },
];

/** An olive branch, cherry tomatoes and a chilli, for the recipe list. */
export const HOME_ILLUSTRATION: Illustration = {
  ground: "green",
  pieces: [
    { kind: "stroke", d: "M30 330 C90 290 160 230 250 170", colour: "leaf-dark", width: 5 },
    {
      kind: "shape",
      d: "M70 300 C65 286 75.5 259.9 97.3 244.3 C99.4 268.1 87.2 293.3 70 300 Z M112 262 C108.7 247.5 122.3 222.8 145.9 210.1 C145.1 233.9 129.9 257.4 112 262 Z M152 226 C150.5 211.2 167 188.4 192 178.6 C188.3 202.1 170.3 223.6 152 226 Z M196 196 C192 181.7 204.3 156.4 227.2 142.4 C227.6 166.2 213.6 190.5 196 196 Z",
      colour: "leaf",
    },
    {
      kind: "shape",
      d: "M88 292 C101.4 285.5 128.5 293.3 146.2 313.4 C122.8 317.9 96.5 308.4 88 292 Z M132 246 C146.2 241.5 171.9 252.9 186.7 275.3 C162.9 276.5 138.1 263.4 132 246 Z M174 212 C186.9 204.6 214.5 210.4 233.6 229.3 C210.5 235.4 183.6 227.7 174 212 Z M214 188 C222.4 175.7 249.7 168.8 275.1 177.4 C257.1 193 229.5 197.9 214 188 Z",
      colour: "leaf-dark",
    },
    {
      kind: "shape",
      d: "M180 128 C220 126 270 106 290 66 C296 54 286 48 280 58 C262 92 220 114 176 118 C168 119 170 128 180 128 Z",
      colour: "tomato",
    },
    { kind: "stroke", d: "M284 60 C286 46 296 36 310 32", colour: "leaf-dark", width: 6 },
    {
      kind: "shape",
      d: "M264 212 C264 196.9 276.3 185 292 185 C306.6 185 318 196.9 318 212 C318 228.2 306.6 241 292 241 C276.3 241 264 228.2 264 212 Z",
      colour: "tomato",
    },
    {
      kind: "shape",
      d: "M192 266 C192 243.6 211.4 226 236 226 C259.5 226 278 243.6 278 266 C278 287.3 259.5 304 236 304 C211.4 304 192 287.3 192 266 Z",
      colour: "tomato",
    },
    {
      kind: "shape",
      d: "M202 256 C205 242 214 234 224 232 C216 240 211 250 210 262 Z",
      colour: "tomato-light",
    },
    {
      kind: "shape",
      d: "M236 228 C230 218 220 216 212 220 C222 222 228 226 232 230 C224 232 218 238 216 244 C226 238 234 234 240 232 C244 238 250 242 258 242 C252 236 248 232 244 230 C252 228 258 222 260 216 C252 218 244 222 240 226 Z",
      colour: "leaf",
    },
    {
      kind: "shape",
      d: "M40 250 C54 240 72 244 78 258 C64 254 52 254 40 250 Z",
      colour: "lemon",
    },
    {
      kind: "shape",
      d: "M111 178 C111 174.6 114.1 172 118 172 C121.4 172 124 174.6 124 178 C124 180.8 121.4 183 118 183 C114.1 183 111 180.8 111 178 Z",
      colour: "ultramarine",
    },
    {
      kind: "shape",
      d: "M295 120 C295 117.2 297.2 115 300 115 C302.2 115 304 117.2 304 120 C304 122.8 302.2 125 300 125 C297.2 125 295 122.8 295 120 Z",
      colour: "pink",
    },
  ],
};
