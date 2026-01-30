/* This file is generated via openapi-typescript. */

export interface components {
  schemas: {
    Candidate: {
      id: string;
      name?: string;
      age?: number;
      photos?: string[];
      bio?: string;
    };
    SwipeRequest: {
      candidateId: string;
      direction: "like" | "nope" | "super";
    };
    SwipeResponse: {
      match?: boolean;
      swipeId?: string;
    };
  };
}

export interface paths {
  "/candidates": {
    get: {
      parameters: {
        query?: {
          limit?: number;
          cursor?: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["Candidate"][];
          };
        };
      };
    };
  };
  "/swipes": {
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["SwipeRequest"];
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["SwipeResponse"];
          };
        };
      };
    };
  };
}
