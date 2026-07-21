import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store has no web implementation; fall back to localStorage there.
export const getToken = (key) => (Platform.OS === "web" ? Promise.resolve(localStorage.getItem(key)) : SecureStore.getItemAsync(key));

export const setToken = (key, value) =>
  Platform.OS === "web" ? Promise.resolve(localStorage.setItem(key, value)) : SecureStore.setItemAsync(key, value);

export const deleteToken = (key) =>
  Platform.OS === "web" ? Promise.resolve(localStorage.removeItem(key)) : SecureStore.deleteItemAsync(key);
