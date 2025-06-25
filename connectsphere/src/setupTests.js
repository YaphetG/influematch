// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// You can add other global setup here if needed.
// For example, mocking global objects or setting up MSW (Mock Service Worker) for API mocking.

// Example of mocking a global object if needed:
// global.matchMedia = global.matchMedia || function() {
//   return {
//     matches: false,
//     addListener: function() {},
//     removeListener: function() {}
//   };
// };

// Mock Firebase services (basic example)
// More sophisticated mocking might be needed for specific tests.
// This is a very basic way to prevent Firebase from trying to initialize.
// jest.mock('firebase/app', () => ({
//   initializeApp: jest.fn(),
// }));
// jest.mock('firebase/auth', () => ({
//   getAuth: jest.fn(() => ({
//     onAuthStateChanged: jest.fn(() => jest.fn()), // Returns an unsubscribe function
//     createUserWithEmailAndPassword: jest.fn(),
//     signInWithEmailAndPassword: jest.fn(),
//     signOut: jest.fn(),
//   })),
// }));
// jest.mock('firebase/firestore', () => ({
//   getFirestore: jest.fn(() => ({})), // Return an empty object or mock specific functions
//   doc: jest.fn(),
//   setDoc: jest.fn(),
//   getDoc: jest.fn(),
//   addDoc: jest.fn(),
//   collection: jest.fn(),
//   query: jest.fn(),
//   where: jest.fn(),
//   getDocs: jest.fn(),
//   Timestamp: {
//     fromDate: jest.fn(date => ({ toDate: () => date, seconds: date.getTime() / 1000, nanoseconds: 0 }))
//   },
//   updateDoc: jest.fn(),
//   increment: jest.fn(),
//   documentId: jest.fn(),
// }));

// Vitest uses vi.mock instead of jest.mock
// The above jest.mock examples would need to be converted to vi.mock if used directly.
// For now, just importing jest-dom. Firebase mocks will be handled per-test or in a dedicated mock file.

console.log('Test setup file loaded: @testing-library/jest-dom imported.');
