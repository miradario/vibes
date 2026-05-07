import {
  CryptoDigestAlgorithm,
  digest,
  getRandomValues,
  randomUUID,
} from "expo-crypto";

type CryptoLike = {
  getRandomValues?: typeof getRandomValues;
  randomUUID?: typeof randomUUID;
  subtle?: {
    digest?: (algorithm: AlgorithmIdentifier, data: BufferSource) => Promise<ArrayBuffer>;
  };
};

const normalizeAlgorithm = (algorithm: AlgorithmIdentifier) => {
  const name = typeof algorithm === "string" ? algorithm : algorithm.name;
  return name.toUpperCase().replace("_", "-");
};

const digestWithExpoCrypto = async (
  algorithm: AlgorithmIdentifier,
  data: BufferSource,
): Promise<ArrayBuffer> => {
  const normalizedAlgorithm = normalizeAlgorithm(algorithm);

  if (normalizedAlgorithm !== "SHA-256") {
    throw new Error(`Unsupported digest algorithm: ${normalizedAlgorithm}`);
  }

  return digest(CryptoDigestAlgorithm.SHA256, data);
};

const installWebCryptoPolyfill = () => {
  const globalScope = globalThis as typeof globalThis & { crypto?: CryptoLike };
  const cryptoObject: CryptoLike = globalScope.crypto ?? {};
  const subtle = cryptoObject.subtle ?? {};

  if (!cryptoObject.getRandomValues) {
    cryptoObject.getRandomValues = getRandomValues;
  }

  if (!cryptoObject.randomUUID) {
    cryptoObject.randomUUID = randomUUID;
  }

  if (!subtle.digest) {
    subtle.digest = digestWithExpoCrypto;
  }

  cryptoObject.subtle = subtle;

  if (!globalScope.crypto) {
    Object.defineProperty(globalScope, "crypto", {
      value: cryptoObject,
      configurable: true,
    });
  }
};

installWebCryptoPolyfill();
