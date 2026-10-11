// Test-only adapters. Never imported by App.tsx or included in native builds.
import React, { createContext, useContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
export const PreviewContext = createContext<any>(null);
export const useNavigation = () => useContext(PreviewContext).nav;
export const useRoute = () => useContext(PreviewContext).route;
export const useFocusEffect = (fn: () => void | (() => void)) =>
  useEffect(fn, [fn]);
export const useAuthSession = () => ({
  data: { user: { id: useContext(PreviewContext).userId } },
});
async function request(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Learning-Preview": "1" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await res.json();
  if (!res.ok) throw Error(result.error ?? "Error de prueba");
  return result;
}
let actor = "owner";
export const supabase = {
  rpc: async (name: string, args?: Record<string, unknown>) => {
    try {
      return {
        data: await request("/api/rpc", { name, args, actor }),
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  },
  from: (table: string) => {
    const query: any = {
      select: () => query,
      order: () => query,
      limit: () => query,
      then: (resolve: (value: any) => any, reject: (error: any) => any) =>
        request(`/api/table?table=${encodeURIComponent(table)}&actor=${actor}`)
          .then(
            (data) => resolve({ data, error: null }),
            (error) => resolve({ data: null, error })
          )
          .catch(reject),
    };
    return query;
  },
};
export const uploadImageToSupabase = async () => {
  throw Error(
    "En esta vista local, usá una URL HTTPS. La subida de archivos usa Supabase Storage en la app real."
  );
};
export const launchImageLibraryAsync = async () => {
  throw Error(
    "En esta vista local, usá una URL HTTPS. El selector de fotos se prueba en la app real."
  );
};
const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
export function Preview({
  screens,
  users,
}: {
  screens: Record<string, React.ComponentType>;
  users: Record<string, string>;
}) {
  const [who, setWho] = useState("owner"),
    [stack, setStack] = useState([{ name: "LearningExplore", params: {} }]),
    [message, setMessage] = useState("");
  actor = who;
  const route = stack[stack.length - 1],
    Component = screens[route.name];
  const nav = {
    navigate: (name: string, params = {}) =>
      setStack((s) => [...s, { name, params }]),
    goBack: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
  };
  return (
    <QueryClientProvider client={client}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 420, height: 900 },
          insets: { top: 0, bottom: 0, left: 0, right: 0 },
        }}
      >
        <PreviewContext.Provider value={{ nav, route, userId: users[who] }}>
          <div
            style={{
              maxWidth: 740,
              margin: "auto",
              padding: 16,
              fontFamily: "sans-serif",
              color: "#2B2B2B",
              background: "#FEFEFD",
            }}
          >
            <strong>PROTOTIPO LOCAL · DATOS FICTICIOS</strong>
            <p>
              Identidad simulada solo para esta prueba. La app real usa Supabase
              Auth.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["owner", "Responsable"],
                ["student", "Alumno"],
                ["other", "Otro alumno"],
                ["outsider", "Sin permisos"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setWho(key);
                    setStack([{ name: "LearningExplore", params: {} }]);
                    setMessage("");
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid #3978B8",
                    background: who === key ? "#3978B8" : "#FEFEFD",
                    color: who === key ? "#FEFEFD" : "#2B2B2B",
                  }}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={async () => {
                  await request("/api/clock", { actor: who });
                  await client.invalidateQueries();
                  setMessage(
                    "Reloj de prueba: comenzaron los encuentros con alumnos."
                  );
                }}
                style={{
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid #3978B8",
                  background: "#FEFEFD",
                  color: "#2B2B2B",
                }}
              >
                Comenzar encuentro (prueba)
              </button>
            </div>
            <p>{message}</p>
          </div>
          <div
            style={{
              maxWidth: 740,
              margin: "auto",
              minHeight: 900,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Component key={`${who}:${stack.length}:${route.name}`} />
          </div>
        </PreviewContext.Provider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
export { React };
