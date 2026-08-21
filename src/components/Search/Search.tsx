import './Search.css'

interface SearchProps {
  handleCancel: () => void;
  message?: string;
}

function Search({ handleCancel, message = 'Searching for players...' }: SearchProps) {

  return (
    <div className="overlay">
      <div className="modal">
        <h3>{ message }</h3>
        <div className="spinner"></div>
        <button type="button" onClick={ handleCancel }>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default Search
