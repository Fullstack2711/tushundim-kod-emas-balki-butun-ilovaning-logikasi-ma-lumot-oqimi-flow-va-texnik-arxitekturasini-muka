import { Stack } from 'expo-router';
import { CreatingAppScreen } from '@/components/CreatingAppScreen';

export default function HomeScreen() {
	return (
		<>
			<Stack.Screen options={{ title: 'Mobile App' }} />
			<CreatingAppScreen />
		</>
	);
}
