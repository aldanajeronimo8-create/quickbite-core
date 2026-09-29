import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisualThemeProvider } from '../contexts/VisualThemeProvider';
import { SetupWizardPage } from './SetupWizardPage';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }) as MediaQueryList,
});

describe('SetupWizardPage', () => {
  it('explains the required first-run configuration', () => {
    render(
      <VisualThemeProvider>
        <SetupWizardPage />
      </VisualThemeProvider>,
    );

    expect(screen.getByRole('heading', { name: /configuración de QuickBite Core/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QuickBite' })).toBeInTheDocument();
    expect(screen.getByText(/Firebase para autenticación/i)).toBeInTheDocument();
    expect(screen.getByText(/VITE_FIREBASE_PROJECT_ID/i)).toBeInTheDocument();
  });
});
