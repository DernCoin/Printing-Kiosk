import React, { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches rendering errors and shows a friendly error screen.
 * Patrons see a simple "something went wrong" message with a retry button.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={64} color="#F57C00" />
          <Text style={styles.title}>Something Went Wrong</Text>
          <Text style={styles.message}>
            Please try again. If the problem continues, ask a staff member for help.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'GoogleSansFlex_700Bold',
  },
  message: {
    fontSize: 18,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    fontFamily: 'GoogleSansFlex_400Regular',
  },
  button: {
    minHeight: 56,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#7CB342',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'GoogleSansFlex_700Bold',
  },
});
