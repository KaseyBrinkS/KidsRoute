import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type PlaceholderScreenProps = {
  title: string;
};

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.navy,
  },
});
