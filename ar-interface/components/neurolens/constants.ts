import { Person, Memory } from './types'

export const DEMO_MEMORIES: Memory[] = [
  {
    id: 'memory-1',
    personId: 'sarah-johnson',
    title: 'Birthday Celebration',
    date: 'March 15, 2024',
    timestamp: 'Yesterday',
    location: 'Home',
    emoji: '🎂',
    emotionalImportance: 10,
    description: 'Sarah visited for her birthday. We had a wonderful afternoon together in the garden. She brought homemade apple pie and we watched old family videos together.',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop',
    video: 'https://videos.pexels.com/video-files/3755759/3755759-hd_1920_1080_30fps.mp4',
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&h=200&fit=crop'
  },
  {
    id: 'memory-2',
    personId: 'sarah-johnson',
    title: 'Family Vacation',
    date: 'February 10, 2024',
    timestamp: 'Two Weeks Ago',
    location: 'Mountain Resort',
    emoji: '✈️',
    emotionalImportance: 9,
    description: 'We took a wonderful family vacation together. Sarah drove the whole way up the mountains. We stayed at that cozy cabin and made wonderful memories together.',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop'
  },
  {
    id: 'memory-3',
    personId: 'sarah-johnson',
    title: 'Family Dinner',
    date: 'January 20, 2024',
    timestamp: 'One Month Ago',
    location: 'Home',
    emoji: '🍽️',
    emotionalImportance: 8,
    description: 'We had a wonderful family dinner together. Sarah cooked her famous lasagna. Everyone laughed and enjoyed spending time together around the table.',
    image: 'https://images.unsplash.com/photo-1495537821757-a1efb6729352?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1495537821757-a1efb6729352?w=200&h=200&fit=crop'
  }
].sort((a, b) => b.emotionalImportance - a.emotionalImportance)

export const DEMO_PERSON: Person = {
  id: 'sarah-johnson',
  name: 'Sarah Johnson',
  relationship: 'Daughter',
  profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  lastMet: 'Yesterday',
  lastLocation: 'Home',
  tags: ['🎂', '🏠', '🌳'],
  memories: DEMO_MEMORIES
}
