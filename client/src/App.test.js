import { render, screen } from '@testing-library/react';
import App from './App';

test('renders employee management system heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/Employee Management System/i);
  expect(headingElement).toBeInTheDocument();
});
