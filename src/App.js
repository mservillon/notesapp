import logo from './logo.svg';
import './App.css';
import React, {useEffect, useReducer, useState} from 'react'
import { API } from 'aws-amplify'
import { List, Input, Button } from 'antd'
import 'antd/dist/reset.css'
import { v4 as uuid } from 'uuid'
import { listNotes, getNote } from './graphql/queries'
import { createNote as CreateNote,
         deleteNote as DeleteNote,
         updateNote as UpdateNote 
  } from './graphql/mutations'
import { onCreateNote, onUpdateNote } from './graphql/subscriptions'

const CLIENT_ID = uuid()

const initialState = {
  notes: [],
  loading: true,
  error: false,
  form: { name: '', description: '' },
  completed: true
}


function reducer(state, action) {
  switch(action.type) {
    case 'SET_NOTES':
      return { ...state, notes: action.notes, loading: false }
    case 'ADD_NOTE':
      return { ...state, notes: [action.note, ...state.notes], completed: true}
    case 'RESET_FORM':
      return { ...state, form: initialState.form }
    case 'SET_INPUT':
      return { ...state, form: { ...state.form, [action.name]: action.value } }
    case 'COMPLETED':
      return { ...state, notes: action.notes, completed: true}
    case 'ERROR':
      return { ...state, loading: false, error: true }
    default:
      return { ...state};
  }
}

const App = () => {

  const [state, dispatch] = useReducer(reducer, initialState)
  const [number, setNumber] = useState(0);

  const notes = [...state.notes]
  const completion = notes
              .filter(x => x.completed == true)
  console.log((completion).length)

  const fetchNotes = async() => {
    try {
      const notesData = await API.graphql({
        query: listNotes
      })
      dispatch({ type: 'SET_NOTES', notes: notesData.data.listNotes.items })
    } catch (err) {
      console.log('error: ', err)
      dispatch({ type: 'ERROR' })
    }
  }

  const createNote = async() => {
    const { form } = state // destructuring - form element out of state 

    if (!form.name || !form.description) {
       return alert('please enter a name and description')
    }

    const note = { ...form, clientId: CLIENT_ID, completed: false, id: uuid() }
    dispatch({ type: 'ADD_NOTE', note })
    dispatch({ type: 'RESET_FORM' })

    try {
      await API.graphql({
        query: CreateNote,
        variables: { input: note }
      })
      console.log('successfully created note!')
    } catch (err) {
      console.error("error: ", err)
    }
  }

  const deleteNote = async({ id }) => {
    const index = state.notes.findIndex(n => n.id === id)
    const notes = [
      ...state.notes.slice(0, index), // will probably use filter
      ...state.notes.slice(index + 1)];
      dispatch({ type: 'SET_NOTES', notes });

    const verify = prompt("Are you sure you want to delete?, type delete");

    if (verify == "delete") {
        try {
          await API.graphql({
            query: DeleteNote,
            variables: { input: { id } }
          })
          console.log('successfully deleted note!')
        } catch (err) {
          console.error({ err })
        }
        alert("Successfully deleted note!")
  } else {
      alert("Wrong input or pressed cancel. Delete cancelled")
      return fetchNotes();
  }
  }

  const updateNote = async(note) => {
    const index = state.notes.findIndex(n => n.id === note.id)
    const notes = [...state.notes]
    notes[index].completed = !note.completed
    dispatch({ type: 'SET_NOTES', notes})
    
    console.log(state.notes);
    try {
      await API.graphql({
        query: UpdateNote,
        variables: { input: { id: note.id, completed: notes[index].completed} }
      })
      console.log('note successfully updated!')
    } catch (err) {
      console.error('error: ', err)
    }
  }

  const onChange = (e) => {
    dispatch({ type: 'SET_INPUT', name: e.target.name, value: e.target.value })
  }

  useEffect(() => {
    fetchNotes()
    const subscription = API.graphql({
      query: onCreateNote
    })
      .subscribe({
        next: noteData => {
          const note = noteData.value.data.onCreateNote
          if (CLIENT_ID === note.clientId) return
          dispatch({ type: 'ADD_NOTE', note })
        }
      })
      return () => subscription.unsubscribe()
    }, [])

  useEffect(() => {
    // const updateNote = async(note) => {
    //   const index = state.notes.findIndex(n => n.id === note.id)
    //   const notes = [...state.notes]
    //   notes[index].completed = !note.completed
    //   dispatch({ type: 'SET_NOTES', notes})
      
    //   console.log(state.notes);
    //   try {
    //     await API.graphql({
    //       query: UpdateNote,
    //       variables: { input: { id: note.id, completed: notes[index].completed} }
    //     })
    //     if (note.completed == true) {
    //       setNumber(number + 1)
    //     } else {
    //       setNumber(number - 1)
    //     }
    //     console.log('note successfully updated!')
    //     dispatch({ type: 'COMPLETED', notes})
    //   } catch (err) {
    //     console.error('error: ', err)
    //   }
    // }
  }, [])
  

  /*
  const completion = async(note) => {
    const index = state.notes.findIndex(n => n.id === note.id)
    const notes = [...state.notes]
    notes[index].completed = !note.completed
    dispatch({ type: 'SET_NOTES', notes})

    try {
      await API.graphql({
        query: UpdateNote,
        variables: { input: { id: note.id, completed: notes[index].completed } }
      })
      console.log('note successfully updated!')
      if (note.completed == true) {
        setNumber(number + 1);
      } else {
        setNumber(number - 1);
      }
    } catch (err) {
      console.error('error: ', err)
    }
  }
  */
    
  const styles = {
    container: {padding: 20},
    input: {marginBottom: 10},
    item: { textAlign: 'left' },
    p: { color: '#1890ff' }
  }

  const renderItem = (item) => {
    return (
      <List.Item 
        style={styles.item}
        actions={[
          <p style={styles.p} onClick={() => deleteNote(item)}>Delete</p>,
          <p style={styles.p} onClick={() => updateNote(item)}>
          {item.completed ? 'completed!' : 'mark completed'}
          </p>
        ]}
        >
        <List.Item.Meta
          title={item.name}
          description={item.description}
        />
      </List.Item>
    )
  }

  return (
    <div style={styles.container}>
      <Input
        onChange={onChange}
        value={state.form.name}
        placeholder="Note Name"
        name='name'
        style={styles.input}
      />
      <Input
        onChange={onChange}
        value={state.form.description}
        placeholder="Note description"
        name='description'
        style={styles.input}
      />
      <Button
        onClick={createNote}
        type="primary"
      >Create Note</Button>
      <hr />
        <h3>{(state.notes).length} total notes / {(completion).length} completed</h3>
        {console.log(state.notes)}
      <hr />
    <List
        loading={state.loading}
        dataSource={state.notes}
        renderItem={renderItem}
    />
  </div>
  );
}

export default App;
