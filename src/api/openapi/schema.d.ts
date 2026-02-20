/* This file is generated via openapi-typescript. */

export interface components {
  schemas: {
    Candidate: {
      id: string;
      display_name?: string;
      orientation?: string[];
      photos?: components["schemas"]["Photos"][];
      email: string;
      phone?: string;
      birthDate?: Date;
      genderId?: number;
      intentId?: number;
      path: string[];
      isTeacher: boolean;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    SwipeRequest: {
      targetUserId: string;
      direction: "like" | "pass" | "super";
    };
    SwipeResponse: {
      match?: boolean;
      swipeId?: string;
    };
    Photos: {
      id: string;
      url: string;
      order: number;
      isPrimary: boolean;
    }[];
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
